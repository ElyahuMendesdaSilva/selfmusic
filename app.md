# Music API — Documentação

API em Python (FastAPI + SQLAlchemy + yt-dlp) para o seu homelab: autenticação de usuários,
gerenciamento do banco de dados, importação/download automático de playlists públicas do
YouTube, busca de músicas com metadados e upload de pastas de músicas (cada pasta vira
uma playlist).

---

## 1. Visão geral e decisões de arquitetura

| Requisito pedido | Como foi resolvido |
|---|---|
| Login, registro, exclusão, administração | `auth/`, `services/user_service.py`, `routers/auth_router.py`, `routers/admin_router.py` |
| Criar/gerenciar/apagar banco | `database/connection.py` (classe `Database`) + `routers/database_router.py` |
| Baixar playlist do YouTube por link | `services/youtube_service.py` + `services/playlist_service.py` |
| Sincronização diária (adiciona/remove músicas) | `services/scheduler_service.py` (APScheduler, roda 1x/dia) |
| Playlist privada, músicas públicas | Modelo de dados: `Playlist.owner_id` (privado) x tabela `songs` global |
| Busca de música específica + metadados | `services/song_service.py` (`/songs/search-and-download`) |
| Subir pasta de músicas (pasta vira playlist) | `services/playlist_service.py` (`import_uploaded_folder`) + `routers/playlist_router.py` (`POST /playlists/upload`) |
| Escrito em Python, com classes, múltiplos arquivos | Projeto inteiro orientado a objetos, um arquivo por responsabilidade |

### 1.1 Por que as músicas são "globais" mas as playlists são privadas

Você pediu explicitamente esse comportamento, então o modelo de dados foi desenhado assim:

- Tabela **`songs`**: cada música baixada do YouTube é salva **uma única vez**, identificada
  pelo `youtube_id`. Se dois usuários importarem playlists diferentes que contenham a mesma
  música, ela **não é baixada de novo** — apenas vinculada à nova playlist. Isso economiza
  espaço em disco e banda no seu homelab.
- Tabela **`playlists`**: pertence a um `owner_id` (usuário). As rotas de listagem (`GET
  /playlists/`) **sempre filtram por `owner_id == usuário autenticado`**, então a playlist
  "Minhas Músicas" de um usuário nunca aparece para outro.
- Tabela de associação **`playlist_songs`**: liga playlists a músicas (N:N), com a posição
  da música na playlist.

Ou seja: a música em si é um recurso compartilhado da biblioteca; a playlist é só uma
"lista de reprodução" pessoal apontando para músicas dessa biblioteca.

### 1.2 Organização dos arquivos de áudio em disco

```
MUSIC_LIBRARY_DIR/
├── songs/                     <- biblioteca real, um arquivo por música (youtube_id.mp3 ou upload_<hash>.<ext>)
│   ├── dQw4w9WgXcQ.mp3
│   ├── upload_1a2b3c4d5e6f7a8b.flac
│   └── ...
├── covers/                    <- capas extraídas dos uploads (song_<id>.jpg/png/webp)
│   ├── song_42.jpg
│   └── ...
└── playlists/
    ├── Rock Anos 80/           <- pasta com o nome da playlist (como você pediu)
    │   ├── Song A.mp3          <- link simbólico apontando para songs/<id>.mp3
    │   └── Song B.mp3
    └── Minhas Musicas/
        └── Song C.mp3
```

Isso cumpre literalmente o pedido ("baixa todas as músicas da playlist em uma pasta com o
nome da playlist") e ao mesmo tempo evita duplicar o arquivo físico no disco quando a mesma
música está em várias playlists (seja vinda do YouTube ou de upload de pasta) — a pasta da
playlist guarda apenas um **link simbólico** para o arquivo real em `songs/`. Se o seu
sistema de arquivos não suportar links simbólicos, o código automaticamente faz uma cópia
normal do arquivo.

### 1.3 Estrutura de pastas do projeto

```
music_api/
├── main.py                     # cria o FastAPI, registra rotas, inicia o scheduler
├── config.py                   # todas as configurações (lidas de variáveis de ambiente)
├── requirements.txt
├── .env.example
├── database/
│   ├── connection.py            # classe Database: cria/apaga banco, gera sessões
│   └── models.py                # User, Song, Playlist, PlaylistSong (SQLAlchemy)
├── auth/
│   ├── security.py              # classe SecurityService: hash de senha + JWT
│   └── dependencies.py          # get_current_user / get_current_admin
├── schemas/                     # modelos Pydantic (validação de entrada/saída da API)
│   ├── user_schemas.py
│   ├── playlist_schemas.py
│   └── song_schemas.py
├── services/                    # regras de negócio (o "cérebro" da aplicação)
│   ├── user_service.py          # classe UserService
│   ├── playlist_service.py      # classe PlaylistService
│   ├── song_service.py          # classe SongService
│   ├── youtube_service.py       # classe YouTubeService (yt-dlp)
│   └── scheduler_service.py     # classe SchedulerService (job diário)
└── routers/                     # endpoints HTTP (camada fina, chama os services)
    ├── auth_router.py
    ├── admin_router.py
    ├── database_router.py
    ├── playlist_router.py
    └── song_router.py
```

---

### 1.4 Já dá pra escutar música com a API no estado atual?

**Sim, com o endpoint de streaming (`GET /songs/{id}/stream`) adicionado nesta versão.**
Antes disso, a API só baixava e organizava os arquivos — não existia nenhuma forma do app
cliente reproduzir o áudio. Agora qualquer player (web, mobile, desktop) pode apontar para
essa URL e tocar a música normalmente, com suporte a avançar/voltar na faixa (`Range`).

O que **ainda não existe** e você pode querer adicionar depois, dependendo do app:
- Histórico de reprodução / "escutado recentemente"
- Curtir/favoritar músicas
- Fila de reprodução (next/previous) — hoje isso ficaria a cargo do app, usando a lista de
  músicas da playlist (`GET /playlists/{id}`) e chamando `/songs/{id}/stream` uma por vez
- Endpoint dedicado para servir a capa/thumbnail (hoje só temos a URL externa do YouTube em
  `thumbnail_url`, que o app pode carregar diretamente)



### 2.1 Dependências do sistema

O download de áudio precisa do **ffmpeg** instalado no servidor (usado pelo yt-dlp para
converter para mp3):

```bash
sudo apt update && sudo apt install -y ffmpeg
```

### 2.2 Dependências Python

```bash
cd music_api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2.3 Configuração

Copie `.env.example` para `.env` e ajuste os valores (principalmente `JWT_SECRET_KEY` e a
senha do admin padrão):

```bash
cp .env.example .env
```

Variáveis disponíveis (todas em `config.py`):

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_HOST` | `192.168.0.12` | Host do MySQL |
| `DB_PORT` | `3306` | Porta do MySQL |
| `DB_USER` | `casaos` | Usuário do MySQL |
| `DB_PASSWORD` | `casaos` | Senha do MySQL |
| `DB_NAME` | `music_api` | Nome do banco (a API cria automaticamente) |
| `JWT_SECRET_KEY` | *(troque!)* | Chave usada para assinar os tokens JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Validade do token de login |
| `MUSIC_LIBRARY_DIR` | `/mnt/music_library` | Onde os arquivos de música são salvos |
| `SYNC_HOUR` / `SYNC_MINUTE` | `4` / `0` | Horário (UTC) da sincronização diária |
| `FIRST_ADMIN_USERNAME/PASSWORD/EMAIL` | `admin` / `admin123` / ... | Conta admin criada automaticamente na 1ª execução |

> ⚠️ **Importante:** como não há nenhum usuário no banco na primeira execução, a API cria
> automaticamente uma conta administradora com essas credenciais e avisa no log. **Troque a
> senha imediatamente** (crie um novo admin e delete/desative o padrão, ou apenas troque a
> variável `FIRST_ADMIN_PASSWORD` antes do primeiro start).

### 2.4 Executando

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

A documentação interativa (Swagger) fica disponível em `http://SEU_IP:8000/docs`.

### 2.5 Rodando como serviço (systemd) — recomendado para homelab

Crie `/etc/systemd/system/music-api.service`:

```ini
[Unit]
Description=Music API
After=network.target

[Service]
Type=simple
WorkingDirectory=/caminho/para/music_api
EnvironmentFile=/caminho/para/music_api/.env
ExecStart=/caminho/para/music_api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now music-api
```

---

## 3. Modelo de dados

```
users                    songs                         playlists
──────                   ──────                        ──────────
id (PK)                  id (PK)                        id (PK)
username (unique)        youtube_id (unique)             name
email (unique)           title                           owner_id (FK -> users.id)
password_hash            artist                           source_type (youtube|manual|upload)
is_admin                 album                            youtube_playlist_url
is_active                genre                            youtube_playlist_id
created_at                duration_seconds                created_at
                          release_date                     last_synced_at
                          view_count
                          thumbnail_url
                          file_path
                          source_url
                          added_at

playlist_songs (N:N entre playlists e songs)
───────────────
playlist_id (FK)
song_id (FK)
position
added_at
```

---

## 4. Endpoints da API

Todas as rotas (exceto `/`, `/auth/register` e `/auth/login`) exigem o header:
`Authorization: Bearer <token>`

### 4.1 Autenticação — `/auth`

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria uma conta (`username`, `email`, `password`) |
| POST | `/auth/login` | Login por **e-mail** (JSON: `{"email": "...", "password": "..."}`), retorna `access_token` (JWT) |
| GET | `/auth/me` | Retorna os dados da conta autenticada |
| DELETE | `/auth/me` | Exclui a própria conta permanentemente |

> O login mudou de "usuário/senha em formulário" para **e-mail/senha em JSON**. No Swagger
> (`/docs`), teste chamando `POST /auth/login` diretamente (não pelo botão "Authorize"),
> copie o `access_token` retornado e cole no botão **Authorize** (ele agora só pede o token,
> sem usuário/senha — usamos `HTTPBearer` em vez do fluxo OAuth2 padrão).

### 4.2 Administração — `/admin/users` (somente `is_admin=true`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/users/` | Lista todos os usuários |
| PATCH | `/admin/users/{id}` | Altera `is_admin` e/ou `is_active` de um usuário |
| DELETE | `/admin/users/{id}` | Exclui a conta de qualquer usuário |

### 4.3 Banco de dados — `/admin/database` (somente admin)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/admin/database/create` | Cria o banco (se não existir) e as tabelas |
| POST | `/admin/database/reset-tables` | Apaga e recria as tabelas (perde os dados) |
| DELETE | `/admin/database/drop` | Apaga o banco de dados por completo |
| GET | `/admin/database/status` | Verifica se o banco existe no servidor MySQL |

### 4.4 Playlists — `/playlists` (privadas por usuário)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/playlists/` | Lista somente as playlists do usuário autenticado |
| POST | `/playlists/manual` | Cria playlist vazia (`name`) |
| POST | `/playlists/import-youtube` | Importa playlist do YouTube (`name`, `youtube_url`) — baixa tudo |
| POST | `/playlists/upload` | Sobe uma pasta de músicas via `multipart/form-data` (`files`, opcional `playlist`) — a pasta vira uma playlist |
| GET | `/playlists/{id}` | Detalha uma playlist (com as músicas) |
| DELETE | `/playlists/{id}` | Exclui a playlist (apaga arquivos órfãos do disco) |
| POST | `/playlists/{id}/sync` | Força sincronização imediata (sem esperar o job diário) |

### 4.4.1 Upload de pasta de músicas

Este endpoint recebe uma pasta inteira de músicas via `multipart/form-data` e a transforma
em uma playlist privada (`source_type = "upload"`). **Não é preciso zipar nada**: o cliente
envia cada arquivo individualmente em um único request, e o caminho (pasta) de cada arquivo
viaja junto com o nome — exatamente como os navegadores fazem quando você seleciona uma
pasta inteira no input `webkitdirectory`.

#### 4.4.1.1 Resumo do request

| Item | Valor |
|---|---|
| Método | `POST` |
| Rota | `/playlists/upload` |
| Autenticação | obrigatória (`Authorization: Bearer <token>`) |
| Content-Type | `multipart/form-data` |
| Campos | `files` (obrigatório, repetido) e `playlist` (opcional) |
| Sucesso | `201 Created` retornando a playlist criada com as músicas |

Campos do corpo `multipart/form-data`:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `files` | arquivo de áudio (repetível) | sim | Um por música da pasta. O nome pode conter o caminho relativo (ex.: `Album 01/Musica A.mp3`). Envie **todos** os arquivos no mesmo request. |
| `playlist` | texto | não | Nome da playlist. Se omitido, a API usa a pasta raiz comum dos arquivos enviados. |

> ⚠️ O nome do campo é exatamente `files` (sem colchetes). Alguns clientes/frameworks
> usam a convenção `files[]` para listas em formulários, mas este endpoint espera o campo
> `files` repetido N vezes.

#### 4.4.1.2 Como a API decide o nome da playlist

1. Se o campo `playlist` for informado (e não estiver em branco), ele é usado.
2. Caso contrário, a API analisa os caminhos dos arquivos recebidos:
   - Se todos os arquivos vierem com o mesmo **primeiro nível de pasta** (ex.:
     `Album 01/Musica A.mp3`, `Album 01/Musica B.flac`), a playlist se chama
     `Album 01` — mesmo que existam subpastas dentro de `Album 01/`.
   - Se não houver uma pasta raiz comum (arquivos soltos, ou raízes diferentes),
     o nome vira `Upload <data e hora>` (ex.: `Upload 09-08-2026 19:30`).
3. **Conflito de nome**: se você já possui uma playlist com o mesmo nome, a API responde
   `409 Conflict`. Nesse caso, reenvie informando o campo `playlist` com outro nome (ou
   exclua a playlist existente).

#### 4.4.1.3 Formatos de áudio aceitos

| Grupo | Extensões |
|---|---|
| Compactados | `.mp3`, `.m4a`, `.aac` |
| Ogg/Opus | `.ogg`, `.oga`, `.opus` |
| Sem perda / outros | `.flac`, `.wav`, `.wma` |

- A extensão é verificada sem diferenciar maiúsculas/minúsculas (`.MP3` também funciona).
- Arquivos que **não** têm uma dessas extensões são **ignorados silenciosamente**
  (capas `cover.jpg`, letras `.txt`, etc.) — desde que pelo menos um áudio válido exista.
- Se **nenhum** arquivo válido for enviado, a resposta é `400 Bad Request`, com a lista de
  extensões aceitas na mensagem.

#### 4.4.1.4 O que acontece com cada arquivo enviado

1. O conteúdo é gravado temporariamente e o **SHA-256** é calculado.
2. Se o mesmo conteúdo já apareceu neste request, ele é vinculado à música já criada
   (deduplicação por conteúdo — não cria duplicata na playlist).
3. O arquivo é movido para a biblioteca central como `music_library/songs/upload_<16 primeiros chars do hash>.<ext>`.
4. Os **metadados** são lidos com `mutagen` (título, artista, álbum, gênero e duração).
   - Se o arquivo não tiver tags legíveis, o **título vira o nome do arquivo** (sem extensão).
5. **Deduplicação global**: se já existe no banco uma música com o mesmo
   `título + artista + álbum`, o arquivo não é duplicado no disco — a música existente é
   reaproveitada e vinculada à nova playlist.
6. A música é vinculada à playlist na **posição em que o arquivo veio no request**
   (o 1º arquivo enviado fica na posição 0, o 2º na posição 1, e assim por diante).
7. Na pasta do disco, `music_library/playlists/<nome da playlist>/` recebe um **link
   simbólico** `<título>.mp3 -> songs/upload_<hash>.<ext>` (se o filesystem não suportar
   symlink, é feita uma cópia normal).
8. **Capa**: se o arquivo tiver uma imagem embutida (frame APIC do MP3 / picture do
   FLAC/OGG), ela é salva em `music_library/covers/song_<id>.<ext>` e o campo
   `thumbnail_url` da música passa a apontar para `GET /songs/{id}/cover`. Músicas sem
   imagem embutida ficam com `thumbnail_url = null` (o app mostra o ícone padrão).

Se a mesma música foi enviada em `files` mais de uma vez no mesmo request, ela entra
**uma única vez** na playlist (a primeira ocorrência define a posição).

#### 4.4.1.5 Resposta de sucesso (`201 Created`)

```json
{
  "id": 3,
  "name": "Album 01",
  "source_type": "upload",
  "youtube_playlist_url": null,
  "created_at": "2026-08-09T19:30:00",
  "last_synced_at": "2026-08-09T19:30:00",
  "total_songs": 2,
  "songs": [
    {
      "id": 42,
      "youtube_id": null,
      "title": "Musica A",
      "artist": "Artista A",
      "album": "Album 01",
      "genre": "Rock",
      "duration_seconds": 215,
      "release_date": null,
      "view_count": null,
      "thumbnail_url": "http://SEU_IP:8000/songs/42/cover",
      "added_at": "2026-08-09T19:30:01"
    },
    {
      "id": 43,
      "youtube_id": null,
      "title": "Musica B",
      "artist": "Artista B",
      "album": "Album 01",
      "genre": null,
      "duration_seconds": 188,
      "release_date": null,
      "view_count": null,
      "thumbnail_url": null,
      "added_at": "2026-08-09T19:30:01"
    }
  ]
}
```

Use o `id` retornado para consultar a playlist (`GET /playlists/{id}`) e o `id` de cada
música para reproduzir via streaming (`GET /songs/{id}/stream`).

#### 4.4.1.6 Erros possíveis

| Status | Motivo |
|---|---|
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `422 Unprocessable Entity` | Request sem o campo `files`, ou formato do corpo errado |
| `400 Bad Request` | Nenhum arquivo de áudio válido enviado |
| `409 Conflict` | Você já tem uma playlist com o nome escolhido |

#### 4.4.1.7 Exemplos práticos

**`curl` — nome da playlist explícito** (recomendado quando os arquivos estão soltos):

```bash
curl -X POST http://SEU_IP:8000/playlists/upload \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "playlist=Album 01" \
  -F "files=@/caminho/Album 01/Musica A.mp3" \
  -F "files=@/caminho/Album 01/Musica B.flac"
```

**`curl` — deixando a pasta ser detectada** (use `;filename=Pasta/Arquivo`, porque o
`curl` por padrão envia só o nome do arquivo):

```bash
curl -X POST http://SEU_IP:8000/playlists/upload \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "files=@Musica A.mp3;filename=Album 01/Musica A.mp3" \
  -F "files=@Musica B.flac;filename=Album 01/Musica B.flac"
```

**Python (`requests`)** — enviando uma pasta real do disco:

```python
import requests

token = "SEU_TOKEN"
playlist_name = "Album 01"

files = [
    ("files", ("Album 01/Musica A.mp3", open("Musica A.mp3", "rb"), "audio/mpeg")),
    ("files", ("Album 01/Musica B.flac", open("Musica B.flac", "rb"), "audio/flac")),
]
data = {"playlist": playlist_name}

r = requests.post(
    "http://SEU_IP:8000/playlists/upload",
    headers={"Authorization": f"Bearer {token}"},
    data=data,
    files=files,
)
print(r.status_code)
print(r.json())
```

**Navegador — selecionando a pasta inteira** (o atributo `webkitdirectory` faz o browser
enviar cada arquivo com seu caminho relativo):

```html
<input type="file" webkitdirectory id="pasta" />
```

```js
const input = document.getElementById("pasta");
input.addEventListener("change", () => {
  const formData = new FormData();
  for (const file of input.files) {
    // webkitRelativePath preserva "Album 01/Musica A.mp3" no nome enviado
    formData.append("files", file, file.webkitRelativePath);
  }
  formData.append("playlist", "Album 01");

  fetch("http://SEU_IP:8000/playlists/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData,
  }).then((res) => res.json()).then(console.log);
});
```

**Swagger (`/docs`)**: abra `POST /playlists/upload`, clique em **Authorize** e cole o
token; no campo `files`, adicione um item para cada arquivo da pasta (cada item vira um
seletor de arquivo). Como o Swagger envia apenas o nome do arquivo (sem o caminho da
pasta), preencha o campo opcional `playlist` com o nome desejado — o caminho relativo só
pode ser enviado via `curl`, Python ou navegador com `webkitdirectory`.

#### 4.4.1.8 Dicas e limitações

- A **ordem** dos arquivos no request define a ordem das músicas na playlist.
- Envie a **pasta inteira em um único request**; reenviar com o mesmo nome de playlist
  resulta em `409 Conflict`.
- Subpastas são aceitas, mas o nome da playlist é sempre a **pasta raiz** (ou o campo
  `playlist`) — tudo é achatado em uma playlist só.
- Pastas vazias / subpastas sem áudio não geram músicas.
- O nome da playlist e o título das músicas são sanitizados para a pasta no disco (caracteres
  como `\ / * ? " < > |` viram `_`).
- Playlists do tipo `upload` **não** são sincronizadas com o YouTube (o `sync` diário só
  atende playlists `youtube`); o upload é uma importação pontual.
- Para volumes grandes, considere enviar em lote e usar `--limit-rate` no `curl` ou
  aumentar o timeout do cliente — o upload é gravado em disco em pedaços de 1 MB.

### 4.5 Músicas — `/songs` (biblioteca compartilhada entre todos)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/songs?limit=20` | Lista as **músicas mais recentes** da biblioteca global (feed de "Últimas músicas"), sem termo de busca — do mais novo para o mais antigo |
| GET | `/songs/search?q=...` | Busca músicas já existentes na biblioteca (título/artista/álbum) |
| POST | `/songs/search-and-download?q=...` | Busca no YouTube e baixa uma música específica com metadados |
| GET | `/songs/{id}/stream` | **Transmite o áudio da música** (streaming, com suporte a `Range` para dar play/pause/avançar) |
| GET | `/songs/{id}/cover` | Devolve a **capa da música** extraída do arquivo de upload (pública, sem token — o app carrega em `<Image>` como faz com as capas do YouTube) |

> **Capa das músicas**: downloads do YouTube usam a thumbnail oficial (`thumbnail_url`); uploads com imagem embutida têm a capa extraída e servida em `GET /songs/{id}/cover` (rota pública). Nas respostas da API, `thumbnail_url` sempre vem como **URL absoluta** da própria API (ex.: `http://SEU_IP:8000/songs/42/cover`), pronta para o app carregar no componente de imagem.

`GET /songs` é o feed global: retorna as músicas recém-adicionadas à biblioteca compartilhada (vindas de qualquer usuário, tanto de upload de pastas quanto do YouTube), útil para telas de "Últimas músicas" ou "Recomendadas" no início do app. A seção 4.5.1 abaixo explica em detalhes como usar o endpoint.

### 4.5.1 `GET /songs` — feed de "Últimas músicas"

Este endpoint lista as músicas **mais recentes** da biblioteca global, **sem termo de
busca** (diferente do `/songs/search`, onde `q` é obrigatório) — ideal para montar a tela
de "Últimas músicas" / "Recomendadas" do início do app.

#### 4.5.1.1 Resumo do request

| Item | Valor |
|---|---|
| Método | `GET` |
| Rota | `/songs` |
| Autenticação | obrigatória (`Authorization: Bearer <token>`) |
| Parâmetro opcional | `limit` (query string) |
| Sucesso | `200 OK` devolvendo uma lista de músicas (JSON array) |

#### 4.5.1.2 Parâmetro `limit`

| Parâmetro | Local | Tipo | Padrão | Regras | Descrição |
|---|---|---|---|---|---|
| `limit` | query string | inteiro | `20` | mínimo `1`, máximo `100` | Quantidade máxima de músicas a retornar. |

Exemplos:

```text
GET /songs                -> as 20 músicas mais recentes
GET /songs?limit=5        -> as 5 mais recentes
GET /songs?limit=100      -> as 100 mais recentes (máximo permitido)
GET /songs?limit=0        -> erro 422 (abaixo do mínimo)
GET /songs?limit=1000     -> erro 422 (acima do máximo)
```

#### 4.5.1.3 O que a resposta contém

Cada item da lista é uma música com estes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | inteiro | ID da música (use em `/songs/{id}/stream` para tocar) |
| `youtube_id` | string ou `null` | ID do vídeo no YouTube (`null` para músicas enviadas por upload) |
| `title` | string | Título (nome do arquivo se o upload não tiver tags) |
| `artist` | string ou `null` | Artista (lido dos metadados, quando existir) |
| `album` | string ou `null` | Álbum (lido dos metadados, quando existir) |
| `genre` | string ou `null` | Gênero (lido dos metadados, quando existir) |
| `duration_seconds` | inteiro ou `null` | Duração em segundos |
| `release_date` | string ou `null` | Data de lançamento (só playlists do YouTube) |
| `view_count` | inteiro ou `null` | Visualizações (só playlists do YouTube) |
| `thumbnail_url` | string ou `null` | URL da capa: do YouTube para downloads; aponta para `GET /songs/{id}/cover` quando a capa é extraída do upload; `null` se a música não tiver imagem |
| `added_at` | data/hora | Quando a música entrou na biblioteca (base da ordenação) |

A ordenação é por `added_at` decrescente (mais recente primeiro). Como a biblioteca é
**global**, o feed mistura uploads de pastas e downloads do YouTube de **todos** os
usuários — a mesma música nunca aparece duplicada (a API deduplica por conteúdo e por
metadados).

#### 4.5.1.4 Exemplo de resposta (`200 OK`)

```json
[
  {
    "id": 43,
    "youtube_id": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "album": "Whenever You Need Somebody",
    "genre": "Pop",
    "duration_seconds": 213,
    "release_date": "1987-11-16",
    "view_count": 1500000000,
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "added_at": "2026-08-09T19:30:01"
  },
  {
    "id": 42,
    "youtube_id": null,
    "title": "Musica A",
    "artist": "Artista A",
    "album": "Album 01",
    "genre": "Rock",
    "duration_seconds": 215,
    "release_date": null,
    "view_count": null,
    "thumbnail_url": null,
    "added_at": "2026-08-09T18:00:00"
  }
]
```

#### 4.5.1.5 Erros possíveis

| Status | Motivo |
|---|---|
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `422 Unprocessable Entity` | `limit` fora do intervalo `1`–`100` (ou não numérico) |

#### 4.5.1.6 Exemplos práticos

**`curl`:**

```bash
curl "http://SEU_IP:8000/songs?limit=10" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Python (`requests`):**

```python
import requests

token = "SEU_TOKEN"
r = requests.get(
    "http://SEU_IP:8000/songs",
    params={"limit": 20},
    headers={"Authorization": f"Bearer {token}"},
)
songs = r.json()
for song in songs:
    print(song["id"], song["title"], "-", song["artist"])
```

**Navegador (`fetch`) — montando o feed "Últimas músicas":**

```js
const res = await fetch("http://SEU_IP:8000/songs?limit=20", {
  headers: { Authorization: "Bearer " + token },
});
const songs = await res.json();
// Para tocar a primeira música do feed, use o endpoint de streaming:
const player = new Audio();
player.src = `http://SEU_IP:8000/songs/${songs[0].id}/stream`;
// (o player precisa conseguir enviar o header Authorization — via fetch + Blob,
//  ou um player nativo que permita headers customizados)
```

**Swagger (`/docs`)**: abra `GET /songs`, clique em **Authorize** e cole o token; o
parâmetro `limit` já vem preenchido com `20` — basta escolher o valor e clicar em
*Execute*.

#### 4.5.1.7 Dicas e limitações

- O feed é **global**: inclui músicas de todos os usuários (uploads e YouTube), então
  serve como "recomendadas" ou "últimas músicas" sem depender das playlists do usuário.
- Não há paginação (offset/next) — para "carregar mais", use `limit` maior ou combine
  com `/songs/search`.
- `youtube_id` vem do YouTube; uploads ficam com `null`. Já `thumbnail_url` pode vir
  do YouTube **ou** da capa extraída do arquivo de upload (rota `/songs/{id}/cover`).
- Para reproduzir uma música do feed, pegue o `id` e chame `GET /songs/{id}/stream` com
  o mesmo token.

O endpoint de streaming é o que permite o app realmente **tocar** a música: ele lê o
arquivo em pedaços de 1 MB e responde a requisições `Range` (usadas por qualquer player
de áudio/vídeo em HTML, iOS, Android etc. para pular pra qualquer ponto da faixa sem
baixar o arquivo inteiro primeiro). Um `<audio src="http://SEU_IP:8000/songs/12/stream">`
no seu app já funciona, desde que o header `Authorization: Bearer <token>` seja enviado
(a maioria dos players de app mobile permite configurar headers customizados; em HTML puro
isso normalmente exige buscar o arquivo via `fetch` com o header e criar um Blob, já que a
tag `<audio>` sozinha não manda headers customizados).

---

## 5. Fluxo de uso típico

1. `POST /auth/register` → cria conta
2. `POST /auth/login` → pega o token
3. `POST /playlists/import-youtube` com `{"name": "Rock 80s", "youtube_url": "https://youtube.com/playlist?list=..."}`
   → a API baixa todas as músicas da playlist, salva na biblioteca global e cria a
   playlist privada apontando para elas
4. Todo dia, no horário configurado (`SYNC_HOUR`/`SYNC_MINUTE`), o `SchedulerService`
   percorre **todas** as playlists do tipo `youtube` de **todos os usuários** e chama
   `PlaylistService.sync_youtube_playlist()`:
   - músicas que saíram da playlist do YouTube → removidas da playlist (e do disco, se
     nenhuma outra playlist estiver usando aquele arquivo)
   - músicas novas → baixadas e adicionadas
5. `GET /songs/search?q=nome` → qualquer usuário pode pesquisar entre **todas** as músicas
   já baixadas por qualquer pessoa
6. `POST /songs/search-and-download?q=Artista - Musica` → baixa uma música avulsa (fora de
   playlist), pesquisando diretamente no YouTube
7. `POST /playlists/upload` → envia uma pasta inteira de músicas (multipart) e ela vira
   uma playlist privada (`source_type=upload`), com as músicas salvas na biblioteca global

---

## 6. Segurança — recomendações antes de expor na internet

- Troque `JWT_SECRET_KEY` para uma string aleatória forte.
- Troque a senha do admin padrão (`FIRST_ADMIN_PASSWORD`) antes do primeiro start, ou altere
  logo depois via `PATCH /admin/users/{id}`.
- Coloque a API atrás de um reverse proxy com HTTPS (ex: Nginx Proxy Manager, Traefik,
  Caddy) — o CasaOS geralmente já facilita isso.
- Considere restringir `/admin/*` por IP/VLAN interna do seu homelab, já que apaga banco de
  dados é uma operação destrutiva.
- Os endpoints de banco de dados (`/admin/database/*`) são intencionalmente restritos a
  administradores, exatamente como você pediu ("a api tambem deve criar e gerenciar o
  banco de dados").

### Conexão do app React Native com a API

- O app usa `EXPO_PUBLIC_API_URL` (definida no `.env` da raiz do app) como base de todas
  as chamadas; o valor é embutido no bundle na hora do build — depois de mudar, é preciso
  rebuildar o APK/IPA.
- Builds release do Android 9+ **bloqueiam** conexões `http://` por padrão (cleartext).
  Para testes locais, o `app.json` do app libera com `expo-build-properties` →
  `android.usesCleartextTraffic: true` (e no iOS, `NSAllowsArbitraryLoads` no `infoPlist`).
- Em produção, exponha a API por HTTPS (reverse proxy) e aponte `EXPO_PUBLIC_API_URL`
  para `https://...` — assim o app não depende de liberar cleartext nem de IP de LAN.

---

## 7. Extensões que adicionei (sinta-se à vontade para remover)

- **Login por e-mail** (em vez de username), com autenticação via `HTTPBearer` (JSON puro,
  mais simples de integrar em apps mobile/web do que o fluxo OAuth2 padrão).
- **Streaming de áudio com suporte a `Range`** (`GET /songs/{id}/stream`), essencial para o
  app conseguir tocar as músicas de fato (play, pause, avançar/voltar na faixa).
- **Deduplicação de músicas**: se a mesma música aparece em playlists diferentes (mesmo de
  usuários diferentes), ela é baixada uma única vez.
- **Limpeza automática de arquivos órfãos**: ao remover uma música de uma playlist (manual
  ou pela sincronização diária), o arquivo físico só é apagado se nenhuma outra playlist
  ainda o utiliza — evita quebrar a playlist de outro usuário.
- **Sincronização manual sob demanda** (`POST /playlists/{id}/sync`), além da automática
  diária, para você não precisar esperar o horário agendado enquanto testa.
- **Endpoint de busca+download avulso** (`/songs/search-and-download`), para pesquisar uma
  música específica fora do fluxo de playlists, como pedido ("sistema de pesquisa de
  musicas especifica").
- **Upload de pastas como playlists** (`POST /playlists/upload`): envie uma pasta inteira
  de músicas via `multipart/form-data`; a pasta raiz dá nome à playlist e cada arquivo de
  áudio vira uma música global (metadados lidos com mutagen, deduplicação automática).
- **Capas de uploads** (`GET /songs/{id}/cover`): ao subir uma pasta, a API extrai a
  imagem embutida (APIC/picture) com mutagen, salva em `music_library/covers/` e preenche
  `thumbnail_url` — o app passa a exibir a capa sem nenhuma mudança no cliente.
- **Criação automática do primeiro admin** na primeira execução, para você não ficar sem
  acesso administrativo logo de cara.

## 8. Possíveis melhorias futuras (não implementadas)

- Streaming direto do áudio pela API (hoje ela só baixa/organiza os arquivos; a reprodução
  ficaria a cargo do seu app/cliente lendo os arquivos, ou de um endpoint de streaming que
  posso adicionar se quiser).
- Rate limiting nos endpoints de download, para não sobrecarregar o YouTube/sua conexão.
- Migrations com Alembic (hoje as tabelas são criadas via `Base.metadata.create_all`, o que
  é ótimo para começar mas não versiona alterações de schema no futuro).
- Refresh tokens (hoje o token expira e o usuário precisa logar de novo).

---

## 9. Testes realizados neste ambiente

- Sintaxe de todos os arquivos `.py` validada com `py_compile`.
- Importação completa do `main.py` com todas as dependências instaladas — a aplicação
  carrega sem erros e todas as rotas são registradas corretamente.
- **Não foi possível testar a conexão real com o MySQL (`192.168.0.12`) nem o download real
  do YouTube** neste ambiente de geração de código, pois ele não tem acesso à sua rede
  local nem ao YouTube. Recomendo testar `POST /admin/database/create` primeiro, assim que
  subir a API no seu homelab, para confirmar a conexão com o banco.
