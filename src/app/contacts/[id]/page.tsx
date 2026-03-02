import { redirect } from "next/navigation"

interface Props {
    params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: Props) {
    const { id } = await params
    // Redirect to contacts page with the contact pre-selected
    redirect(`/contacts?contact=${id}`)
}
