import * as React from "react"
import Logo from "@/assets/Logo.png"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Grid2X2Check, ListTodo, MessageCircleHeart, Pen, User } from "lucide-react"
import UserCard from "./user-card"
import { useEffect, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import useComponentContext from "@/contexts/componentContext"
import { Link } from "react-router"
import { Button } from "./ui/button"


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

  return (
    <Sidebar {...props}>
      <AlertDialog open={createPostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose a type of post to create</AlertDialogTitle>
            <AlertDialogDescription className="grid grid-cols-2">
              <Button className="m-1 h-10"><Link to="/post-text">Text</Link></Button>
              <Button className="m-1 h-10"><Link to="/post-image">Image</Link></Button>
              <Button className="m-1 h-10"><Link to="/post-video">Video</Link></Button>
              <Button className="m-1 h-10"><Link to="/post-short-video">Short Video</Link></Button>
              <Button className="m-1 h-10"><Link to="/post-image-story">Image Story</Link></Button>
              <Button className="m-1 h-10"><Link to="/post-video-story">Video Story</Link></Button>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeCreatePostDialog} className="w-full" >Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SidebarHeader>
        <img src={Logo} alt="Logo" />
      </SidebarHeader>
      <SidebarContent>

        <SidebarMenuButton onClick={openCreatePostDialog}>
          <Pen/> Create a Post
        </SidebarMenuButton>

        <SidebarMenuButton>
        <MessageCircleHeart /> Posts
        </SidebarMenuButton>

        <SidebarMenuButton>
        <ListTodo /> Drafts
        </SidebarMenuButton>

        <SidebarMenuButton>
          <Grid2X2Check /> Instances
        </SidebarMenuButton>

        <SidebarMenuButton>
          <User /> User Page
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
