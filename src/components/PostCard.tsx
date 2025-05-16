import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import conf from "@/conf";
import useResponseHandler from "@/hooks/useResponseHandler";
import ReactPlayer from 'react-player';
import { Clock, Bell, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaGlobe } from 'react-icons/fa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PostCard({ post }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [errorNotifications, setErrorNotifications] = useState(null);

  const fetchNotifications = async () => {
    if (!post || !post.id || !post.post_type) {
      toast.error("Post details are missing to fetch notifications.");
      return;
    }
    setIsLoadingNotifications(true);
    setErrorNotifications(null);
    setNotifications([]); // Clear previous notifications

    try {
      const queryParams = new URLSearchParams({
        post_id: post.id,
        post_type: post.post_type,
      }).toString();
      const response = await fetch(`${conf.api_url}/notifications?${queryParams}`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
        },
      });
      const data = await useResponseHandler(response);
      if (data.invalid || !response.ok) {
        const errorMsg = data.text || data.message || "Failed to fetch notifications.";
        toast.error(errorMsg);
        setErrorNotifications(errorMsg);
      } else {
        setNotifications(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length === 0) {
          toast.info("No notifications found for this post.");
        }
      }
    } catch (error) {
      console.error("Fetch notifications error:", error);
      const errorMsg = "An error occurred while fetching notifications.";
      toast.error(errorMsg);
      setErrorNotifications(errorMsg);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const getPreviewContent = () => {
    if (post.post_type === "IMAGE" && post.image_url) {
      return <img src={post.image_url} alt={post.caption || "Post image"} className="max-h-60 w-auto object-contain rounded-md mx-auto my-4" />;
    }
    if (post.post_type === "VIDEO" && post.video_url) {
      return <div className="my-4 mx-auto max-w-full aspect-video"><ReactPlayer url={post.video_url} controls width="100%" height="100%" wrapper="div" /></div>;
    }
    return null;
  };

  const getPlatformIcon = (platformName) => {
    switch (platformName.toLowerCase()) {
      case 'instagram':
        return <FaInstagram className="mr-1 text-pink-500" />;
      case 'facebook':
        return <FaFacebook className="mr-1 text-blue-600" />;
      case 'linkedin':
        return <FaLinkedin className="mr-1 text-blue-400" />;
      default:
        return <FaGlobe className="mr-1 text-gray-500" />;
    }
  };


  var publishedPlatforms = [];
  const Platforms = post.post_configs ? Object.keys(post.post_configs) : [];
  for (const platform of Platforms) {
    if (post.post_configs[platform].POST_ID) {
        publishedPlatforms.push(platform);
    }}
console.log("Published Platforms: ", publishedPlatforms);
  return (
    <Card className="mb-6 w-full max-w-xl relative">
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu onOpenChange={(open) => {
          // Fetch notifications when dropdown is opened, if not already loaded
          if (open && notifications.length === 0 && !isLoadingNotifications && !errorNotifications) {
            fetchNotifications();
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-5 w-5" />
              <span className="sr-only">View Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Post Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingNotifications ? (
              <DropdownMenuItem disabled className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
              </DropdownMenuItem>
            ) : errorNotifications ? (
              <DropdownMenuItem disabled className="text-red-500 flex items-center p-2">
                <AlertCircle className="h-4 w-4 mr-2" /> {errorNotifications}
              </DropdownMenuItem>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <DropdownMenuItem key={notif.id} className={`text-sm p-2 ${notif.error ? 'text-red-600' : 'text-gray-700'}`}>
                  <MessageSquare className={`h-4 w-4 mr-2 flex-shrink-0 ${notif.error ? 'text-red-400' : 'text-blue-400'}`} />
                  <div className="flex-grow">
                    <p className="font-medium">{notif.notification}</p>
                    <p className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleString()}</p>
                    {/* Optionally display platform_instance_id if you have a way to map it to a name */}
                    {/* <p className="text-xs text-gray-400">Instance ID: {notif.platform_instance_id}</p> */}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="text-center p-4 text-gray-500">
                No notifications for this post.
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pt-4 pr-12"> {/* Adjust padding for the bell icon */}
        <CardTitle className="text-lg">
          Post ID: {post.id} <span className="text-base font-normal text-muted-foreground">({post.post_type})</span>
        </CardTitle>
        {post.schedule && (
          <div className="text-xs text-muted-foreground flex items-center mt-1">
            <Clock size={12} className="mr-1" /> Originally Scheduled: {new Date(post.schedule).toLocaleString()}
          </div>
        )}
         <div className="text-xs text-muted-foreground flex items-center mt-1">
            Published: {new Date(post.created_at).toLocaleString()}
          </div>
      </CardHeader>
      <CardContent>
        {getPreviewContent()}
        {(post.caption || post.text) && (
          <div className="mt-2">
            <p className="font-semibold mb-1 text-sm">Content:</p>
            <Textarea
              value={post.caption || post.text || ""}
              readOnly
              className="min-h-[80px] bg-muted/20 text-sm"
            />
          </div>
        )}
        
        {publishedPlatforms.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="font-semibold mb-2 text-sm">Published on:</h4>
            <div className="flex flex-wrap gap-2">
              {publishedPlatforms.map(platformName => (
                <span key={platformName} className="flex items-center text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                  {getPlatformIcon(platformName)}
                  {platformName}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {/* <CardFooter>
        You can add other actions or details here if needed
      </CardFooter> */}
    </Card>
  );
}