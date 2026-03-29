"use client"

import {
    Type, AlignLeft, Mail, Phone, Hash, ChevronDown,
    Circle, CheckSquare, Calendar, Heading, EyeOff
} from "lucide-react"
import type { FieldType } from "./types"
import { FIELD_TYPE_CONFIG } from "./types"

const ICONS: Record<FieldType, any> = {
    short_text: Type,
    long_text: AlignLeft,
    email: Mail,
    phone: Phone,
    number: Hash,
    dropdown: ChevronDown,
    radio: Circle,
    checkbox: CheckSquare,
    date: Calendar,
    header: Heading,
    hidden: EyeOff,
}

interface Props {
    onAdd: (type: FieldType) => void
}

export function FieldPalette({ onAdd }: Props) {
    const fieldTypes = Object.entries(FIELD_TYPE_CONFIG) as [FieldType, typeof FIELD_TYPE_CONFIG[FieldType]][]

    return (
        <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Add Field</p>
            {fieldTypes.map(([type, config]) => {
                const Icon = ICONS[type]
                return (
                    <button
                        key={type}
                        onClick={() => onAdd(type)}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                    >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{config.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
