export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type Workspace = {
    id: number;
    name: string;
    is_personal: boolean;
    owner_id: number;
    pivot?: { role: WorkspaceRole };
};

export type Board = {
    id: number;
    workspace_id: number;
    name: string;
    color: string | null;
    position: number;
};

export type WorkspaceMember = {
    id: number;
    name: string;
    email: string;
    role: WorkspaceRole;
};

export type WorkspaceInvite = {
    id: number;
    token: string;
    expires_at: string | null;
    created_at: string;
};
