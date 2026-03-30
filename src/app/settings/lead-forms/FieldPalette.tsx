"use client"

import {
    Type, AlignLeft, Mail, Phone, Hash, ChevronDown,
    Circle, CheckSquare, Calendar, Heading, EyeOff,
    Upload, PenTool, Star, SlidersHorizontal, MapPin,
    User, Clock, Minus, Image, FileText, Globe
} from "lucide-react"
import type { FieldType } from "./types"
import { FIELD_TYPE_CONFIG } from "./types"

const ICONS: Record<string, any> = {
    Type, AlignLeft, Mail, Phone, Hash, ChevronDown,
    Circle, CheckSquare, Calendar, Heading, EyeOff,
    Upload, PenTool, Star, SlidersHorizontal, MapPin,
    User, Clock, Minus, Image, FileText, Globe,
}

interface Props {
    onAdd: (type: FieldType) => void
}

const CATEGORIES = ["Input", "Choice", "Layout", "Advanced"]

export function FieldPalette({ onAdd }: Props) {
    return (
        <div className="space-y-4">
            {CATEGORIES.map(category => {
                const types = (Object.entries(FIELD_TYPE_CONFIG) as [FieldType, typeof FIELD_TYPE_CONFIG[FieldType]][])
                    .filter(([, config]) => config.category === category)
                return (
                    <div key={category}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">{category}</p>
                        <div className="space-y-0.5">
                            {types.map(([type, config]) => {
                                const Icon = ICONS[config.icon] || FileText
                                return (
                                    <button
                                        key={type}
                                        onClick={() => onAdd(type)}
                                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-left"
                                    >
                                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span>{config.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
