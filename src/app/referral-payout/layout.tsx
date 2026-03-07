export default function PayoutLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-auto"
             style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            {children}
        </div>
    )
}
