import useAuthContext from "@/contexts/authContext"
import { useEffect } from "react"
import { useNavigate } from "react-router"

export default function Home() {
  const {signedIn} = useAuthContext()
  const navigate = useNavigate()
  useEffect(() => {
    if (!signedIn) {
      console.log(signedIn)
      navigate("/login")
    }
  }, [])
  return (
    <>
    Home
    </>
  )
}
