import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import conf from "@/conf"
import useResponseHandler from "@/hooks/useResponseHandler"
import { toast } from "sonner"
import useAuthContext from "@/contexts/authContext"
import { useNavigate } from "react-router-dom"; // Import useNavigate

export function LoginForm({
  className,


  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { signedIn,updateUser, updateToken, toggleSignedIn } = useAuthContext();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSubmit = (e :{preventDefault: ()=> void}) => {
    e.preventDefault();
    fetch(`${conf.api_url}/auth/login/`, {
      method:"POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    })
    .then(res => useResponseHandler(res))
    .then(data => {
      if (data.invalid) return;

      updateUser(username);
      updateToken(data.key);
      toggleSignedIn(true);
      console.log(signedIn)
      localStorage.setItem('omniUserToken', data.key);
      toast('Successfully Logged In')

      navigate("/");
    })
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome to simplifying your social media!</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-6">
              <div className="relative text-center text-sm ">
                  Enter your username and password, and start posting!
              </div>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    required
                    onChange={(e) => setUsername(e.target.value)}
                    value={username}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input id="password" type="password" required onChange={(e) => setPassword(e.target.value)} value={password} placeholder="password" />
                </div>
                <Button className="w-full" type="submit">
                  Login
                </Button>
              </div>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/register" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
