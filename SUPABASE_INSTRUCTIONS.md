# Instruções de Configuração do Supabase

Para que a sincronização do calendário funcione, você precisa configurar um projeto no Supabase.

1.  **Crie uma conta e um projeto** em [https://supabase.com](https://supabase.com).
2.  **Crie a tabela `calendar_data`**:
    *   Vá para o "Table Editor".
    *   Crie uma nova tabela chamada `calendar_data`.
    *   Desmarque "Enable Row Level Security (RLS)" (para simplificar, já que é um app público/compartilhado).
        *   *Nota: Se quiser mais segurança, mantenha RLS e adicione uma política para permitir leitura e escrita para todos (public).*
    *   A tabela deve ter as seguintes colunas:
        *   `id` (int8, Primary Key)
        *   `data` (jsonb)

3.  **Obtenha as Credenciais**:
    *   Vá para "Project Settings" -> "API".
    *   Copie a **Project URL**.
    *   Copie a **anon** / **public** Key.

4.  **Configure no Site**:
    *   Abra o site do calendário.
    *   Clique no botão **"☁️ Configurar Nuvem"** no topo.
    *   Cole a URL e a Chave.
    *   Clique em "Salvar e Conectar".

Pronto! Agora todos os dados serão salvos no Supabase e sincronizados em tempo real entre todos os usuários que tiverem as mesmas credenciais configuradas.
