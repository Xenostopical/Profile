# Hyperdrive

Types:

```python
from cloudflare.types.hyperdrive import Hyperdrive
```

## Configs

Types:

```python
from cloudflare.types.hyperdrive import (
    ConfigCreateResponse,
    ConfigUpdateResponse,
    ConfigListResponse,
    ConfigEditResponse,
    ConfigGetResponse,
    ConfigRestartResponse,
)
```

Methods:

- <code title="post /accounts/{account_id}/hyperdrive/configs">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">create</a>(\*, account_id, \*\*<a href="src/cloudflare/types/hyperdrive/config_create_params.py">params</a>) -> <a href="./src/cloudflare/types/hyperdrive/config_create_response.py">ConfigCreateResponse</a></code>
- <code title="put /accounts/{account_id}/hyperdrive/configs/{hyperdrive_id}">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">update</a>(hyperdrive_id, \*, account_id, \*\*<a href="src/cloudflare/types/hyperdrive/config_update_params.py">params</a>) -> <a href="./src/cloudflare/types/hyperdrive/config_update_response.py">ConfigUpdateResponse</a></code>
- <code title="get /accounts/{account_id}/hyperdrive/configs">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">list</a>(\*, account_id, \*\*<a href="src/cloudflare/types/hyperdrive/config_list_params.py">params</a>) -> <a href="./src/cloudflare/types/hyperdrive/config_list_response.py">SyncV4PagePaginationArray[ConfigListResponse]</a></code>
- <code title="delete /accounts/{account_id}/hyperdrive/configs/{hyperdrive_id}">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">delete</a>(hyperdrive_id, \*, account_id) -> object</code>
- <code title="patch /accounts/{account_id}/hyperdrive/configs/{hyperdrive_id}">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">edit</a>(hyperdrive_id, \*, account_id, \*\*<a href="src/cloudflare/types/hyperdrive/config_edit_params.py">params</a>) -> <a href="./src/cloudflare/types/hyperdrive/config_edit_response.py">ConfigEditResponse</a></code>
- <code title="get /accounts/{account_id}/hyperdrive/configs/{hyperdrive_id}">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">get</a>(hyperdrive_id, \*, account_id) -> <a href="./src/cloudflare/types/hyperdrive/config_get_response.py">ConfigGetResponse</a></code>
- <code title="post /accounts/{account_id}/hyperdrive/configs/{hyperdrive_id}/restart">client.hyperdrive.configs.<a href="./src/cloudflare/resources/hyperdrive/configs.py">restart</a>(hyperdrive_id, \*, account_id) -> <a href="./src/cloudflare/types/hyperdrive/config_restart_response.py">ConfigRestartResponse</a></code>
