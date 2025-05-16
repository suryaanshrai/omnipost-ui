import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import useResponseHandler from "@/hooks/useResponseHandler"
import { toast } from "sonner"
import conf from "@/conf"
import useAuthContext from "@/contexts/authContext"
import { useNavigate } from "react-router"

export function RegistrationForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const { updateUser, updateToken, toggleSignedIn } = useAuthContext();

  const navigate = useNavigate()
  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    fetch(`${conf.api_url}/auth/registration/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        email: email,
        password1: password1,
        password2: password2,
      }),
    })
      .then((res) => useResponseHandler(res))
      .then((data) => {
        if (data.invalid) return;
        
        updateUser(username);
        updateToken(data.key);
        toggleSignedIn(true);
        localStorage.setItem("omniUserToken", data.key);
        toast("Successfully Registered");
        navigate("/");
      });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome to OmniPost!</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="relative text-center text-sm ">
                Fill the following form and get going!
              </div>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    required
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="email"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password1">Password</Label>
                  </div>
                  <Input id="password1" placeholder="password" type="password" required onChange={(e) => setPassword1(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password2">Confirm Password</Label>
                  </div>
                  <Input id="password2" placeholder="confirm password" type="password" required onChange={(e) => setPassword2(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">
                  Register
                </Button>
              </div>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-4">
                  Login
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
