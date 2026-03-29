export type FieldType =
    | "short_text"
    | "long_text"
    | "email"
    | "phone"
    | "number"
    | "dropdown"
    | "radio"
    | "checkbox"
    | "date"
    | "header"
    | "hidden"

export interface FormField {
    id: string
    type: FieldType
    label: string
    placeholder?: string
    helpText?: string
    required: boolean
    defaultValue?: string
    options?: string[]
    width: "full" | "half"
}

export interface FormStyle {
    logoUrl?: string
    title: string
    description?: string
    backgroundColor: string
    accentColor: string
    textColor: string
    fontFamily: string
    buttonText: string
    buttonColor: string
    buttonTextColor: string
    borderRadius: "none" | "sm" | "md" | "lg" | "full"
    successMessage: string
    redirectUrl?: string
    layout: "single" | "two-column"
}

export interface LeadForm {
    id: string
    workspaceId: string
    name: string
    slug: string
    status: "active" | "inactive"
    apiKeyHash: string
    apiKeyPrefix: string
    fields: FormField[]
    style: FormStyle
    submissionCount: number
    createdAt: string
    updatedAt: string
}

export const FIELD_TYPE_CONFIG: Record<FieldType, { label: string; icon: string; defaultLabel: string }> = {
    short_text: { label: "Short Text", icon: "Type", defaultLabel: "Text Field" },
    long_text: { label: "Long Text", icon: "AlignLeft", defaultLabel: "Message" },
    email: { label: "Email", icon: "Mail", defaultLabel: "Email Address" },
    phone: { label: "Phone", icon: "Phone", defaultLabel: "Phone Number" },
    number: { label: "Number", icon: "Hash", defaultLabel: "Number" },
    dropdown: { label: "Dropdown", icon: "ChevronDown", defaultLabel: "Select an option" },
    radio: { label: "Multiple Choice", icon: "Circle", defaultLabel: "Choose one" },
    checkbox: { label: "Checkboxes", icon: "CheckSquare", defaultLabel: "Select all that apply" },
    date: { label: "Date", icon: "Calendar", defaultLabel: "Date" },
    header: { label: "Section Header", icon: "Heading", defaultLabel: "Section Title" },
    hidden: { label: "Hidden Field", icon: "EyeOff", defaultLabel: "hidden_field" },
}

export const FONT_OPTIONS = [
    { value: "Inter, system-ui, sans-serif", label: "Inter (Default)" },
    { value: "system-ui, -apple-system, sans-serif", label: "System" },
    { value: "'Georgia', serif", label: "Georgia (Serif)" },
    { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica" },
    { value: "'Playfair Display', serif", label: "Playfair Display" },
    { value: "'DM Sans', sans-serif", label: "DM Sans" },
    { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
    { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
]

export const BORDER_RADIUS_MAP: Record<FormStyle["borderRadius"], string> = {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
}
