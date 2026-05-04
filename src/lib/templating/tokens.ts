/**
 * Simple, safe mustache-style token renderer.
 *
 * Supports:
 *   {{first_name}}            alias for contact.firstName
 *   {{last_name}}             alias for contact.lastName
 *   {{name}}                  alias for contact.name
 *   {{email}}                 alias for contact.email
 *   {{phone}}                 alias for contact.phone
 *   {{company}}               alias for workspace.name
 *   {{contact.firstName}}     full dot-path access
 *   {{workspace.name}}        full dot-path access
 *
 * Missing tokens render as empty strings (never "undefined"). No JS is
 * executed — this is a pure string replacement on a whitelisted regex.
 */

export interface TokenContact {
    id?: string
    name?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    phone?: string | null
}

export interface TokenWorkspace {
    id?: string
    name?: string | null
}

export interface TokenContext {
    contact?: TokenContact
    workspace?: TokenWorkspace
    /** One-click unsubscribe URL injected by the sender per recipient. */
    unsubscribe_url?: string
    unsubscribeUrl?: string
}

const ALIASES: Record<string, string> = {
    first_name: "contact.firstName",
    firstname: "contact.firstName",
    firstName: "contact.firstName",
    last_name: "contact.lastName",
    lastname: "contact.lastName",
    lastName: "contact.lastName",
    name: "contact.name",
    email: "contact.email",
    phone: "contact.phone",
    company: "workspace.name",
    workspace_name: "workspace.name",
    unsubscribe_url: "unsubscribe_url",
    unsubscribeUrl: "unsubscribe_url",
    unsubscribe: "unsubscribe_url",
    unsub_url: "unsubscribe_url",
}

function lookup(path: string, ctx: TokenContext): string {
    const normalized = ALIASES[path] ?? path
    const parts = normalized.split(".")
    let cursor: unknown = ctx as Record<string, unknown>
    for (const part of parts) {
        if (cursor && typeof cursor === "object" && part in (cursor as Record<string, unknown>)) {
            cursor = (cursor as Record<string, unknown>)[part]
        } else {
            return ""
        }
    }
    if (cursor === null || cursor === undefined) return ""
    return String(cursor)
}

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g

export function renderTokens(input: string, ctx: TokenContext): string {
    if (!input || !input.includes("{{")) return input
    return input.replace(TOKEN_RE, (_match, key: string) => lookup(key, ctx))
}

/**
 * Split a contact's display name into first/last parts. Handles common cases
 * like "Jane Smith", "Jane", "Jane van der Berg" (first = "Jane", last =
 * "van der Berg"). Returns empty strings if name is missing.
 */
export function splitName(fullName: string | null | undefined): {
    firstName: string
    lastName: string
} {
    if (!fullName) return { firstName: "", lastName: "" }
    const trimmed = fullName.trim()
    if (!trimmed) return { firstName: "", lastName: "" }
    const [first, ...rest] = trimmed.split(/\s+/)
    return { firstName: first ?? "", lastName: rest.join(" ") }
}

export function buildContactContext(
    contact: TokenContact | null | undefined,
    workspace?: TokenWorkspace | null,
): TokenContext {
    if (!contact) {
        return { workspace: workspace ?? undefined }
    }
    const { firstName, lastName } = splitName(contact.name)
    return {
        contact: {
            id: contact.id,
            name: contact.name ?? "",
            firstName: contact.firstName ?? firstName,
            lastName: contact.lastName ?? lastName,
            email: contact.email ?? "",
            phone: contact.phone ?? "",
        },
        workspace: workspace ?? undefined,
    }
}
