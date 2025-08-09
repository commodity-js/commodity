import Image from "next/image"

interface LogoProps {
    className?: string
    width?: number
    height?: number
    priority?: boolean
}

export default function Logo({
    className,
    width = 128,
    height = 128,
    priority = false
}: LogoProps) {
    return (
        <Image
            src="/Solvency-logo-crop.png"
            alt="Solvency Logo"
            width={width}
            height={height}
            priority={priority}
            className={`object-contain ${className || ""}`}
        />
    )
}
