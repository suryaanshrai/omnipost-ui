import * as React from "react"
import Logo from "@/assets/Logo.png"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Grid2X2Check, ListTodo, LogOut, MessageCircleHeart, Pen, User } from "lucide-react"
import UserCard from "./user-card"
import { useEffect, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import useComponentContext from "@/contexts/componentContext"
import { Link, useNavigate } from "react-router"
import { Button } from "./ui/button"
import useAuthContext from "@/contexts/authContext"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [dateTime, setDateTime] = useState("");

  useEffect(()=> {
    setInterval(()=> {
      setDateTime(new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",  
        hour12: true,
      }))
    }, 1000);
  }, [])
  
  const { createPostDialog, openCreatePostDialog, closeCreatePostDialog } = useComponentContext();
  const {updateUser, updateToken, toggleSignedIn} = useAuthContext();
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("omniUserToken")
    updateUser("");
    updateToken("");
    toggleSignedIn(false);
    navigate("/login")
  }
  return (
    <Sidebar {...props}>
      <AlertDialog open={createPostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose a type of post to create</AlertDialogTitle>
            <AlertDialogDescription className="grid grid-cols-2">
              <Link to="/post-text" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Text</Button></Link>
              <Link to="/post-image" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Image</Button></Link>
              <Link to="/post-video" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Video</Button></Link>
              <Link to="/post-short-video" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Short Video</Button></Link>
              <Link to="/post-image-story" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Image Story</Button></Link>
              <Link to="/post-video-story" className="m-1 h-10"><Button onClick={closeCreatePostDialog} className="w-full">Video Story</Button></Link>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeCreatePostDialog} className="w-full" >Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SidebarHeader>
        <Link to="/">
        <img src={Logo} alt="Logo" />
        </Link>
      </SidebarHeader>
      <SidebarContent>

        <SidebarMenuButton onClick={openCreatePostDialog}>
          <Pen/> Create Post
        </SidebarMenuButton>

        <Link to="/">
          <SidebarMenuButton>
            <MessageCircleHeart /> Posts
          </SidebarMenuButton>
        </Link>
        
        <Link to="/drafts">
        <SidebarMenuButton>
        <ListTodo /> Drafts
        </SidebarMenuButton>
        </Link>

        <Link to="/instance">
        <SidebarMenuButton>
          <Grid2X2Check /> Instances
        </SidebarMenuButton>
        </Link>

        <SidebarMenuButton onClick={handleLogout}>
          <LogOut /> Logout
        </SidebarMenuButton>
      
      </SidebarContent>

      <SidebarFooter>
        <SidebarContent>
          <UserCard date={dateTime} />
        </SidebarContent>
      </SidebarFooter>
      
    </Sidebar>
  )
}
