import Link from 'next/link'
import React from 'react'

const Footer = () => {
    return (
        <footer className="border-t border-stone-700 py-8 bg-stone-950">
            <div className="mx-auto max-w-6xl px-4 text-sm text-stone-400">
                {/* <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © 1900 League Treaty Portal • Rendered in Next.js & TypeScript
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/about" className="hover:text-stone-200">About</Link>
                        <Link href="/guides" className="hover:text-stone-200">Guides</Link>
                        <Link href="/legal" className="hover:text-stone-200">Legal</Link>
                    </div>
                </div> */}
            </div>
        </footer>
    )
}

export default Footer