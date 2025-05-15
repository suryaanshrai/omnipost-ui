import Logo from "@/assets/Logo.png"
import { RegistrationForm } from "@/components/registration-form"
import { motion } from "framer-motion"

export default function RegistrationPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10 overflow-hidden">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror" }}
        style={{
          background: "linear-gradient(120deg, #f472b6 0%, #a78bfa 50%, #f472b6 100%)",
        }}
      />
      <div className="flex w-full max-w-sm flex-col gap-6 z-10">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pink-100 text-primary-foreground">
            <img src={Logo} />
          </div>
          OmniPost
        </a>
        <RegistrationForm />
      </div>
    </div>
  )
}
