import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import conf from "@/conf";
import useResponseHandler from "@/hooks/useResponseHandler";
import ReactPlayer from 'react-player';
// import { Draft } from '@/pages/Drafts'; // Adjust path if you put Draft interface elsewhere
import { Clock, Edit3, Send, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { FaInstagram, FaFacebook, FaLinkedin } from 'react-icons/fa';
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";


// interface DraftCardProps {
//   draft;
//   onPublishSuccess: (draftId: number) => void;
// }

// interface PlatformInstance {
//   id: number;
//   platform: string;
//   instance_name: string;
// }

export default function DraftCard({ draft, onPublishSuccess }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [platformInstances, setPlatformInstances] = useState([]);
  const [selectedInstances, setSelectedInstances] = useState<number[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const fetchPlatformInstances = async () => {
      setIsLoadingInstances(true);
      try {
        const response = await fetch(`${conf.api_url}/platform_instance/`, {
          headers: {
            "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
          },
        });
        const data = await useResponseHandler(response);
        if (data.invalid || !response.ok) {
          toast.error(data.text || "Failed to fetch platform instances.");
          setPlatformInstances([]);
        } else {
          setPlatformInstances(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Fetch platform instances error:", error);
        toast.error("An error occurred while fetching platform instances.");
        setPlatformInstances([]);
      } finally {
        setIsLoadingInstances(false);
      }
    };

    fetchPlatformInstances();
  }, []);

  const handleInstanceSelection = (instanceId: number) => {
    setSelectedInstances(prevSelected =>
      prevSelected.includes(instanceId)
        ? prevSelected.filter(id => id !== instanceId)
        : [...prevSelected, instanceId]
    );
  };

  const triggerPublishFlow = () => {
    if (selectedInstances.length === 0) {
      toast.error("Please select at least one platform instance to publish to.");
      return;
    }
    setIsPasswordDialogOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!passwordInput) {
      toast.error("Password is required to publish.");
      return;
    }
    setIsPasswordDialogOpen(false);
    setIsPublishing(true);
    toast.info(`Publishing draft ${draft.id}...`);
    try {
      const response = await fetch(`${conf.api_url}/publish/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
        },
        body: JSON.stringify({
          post_id: draft.id,
          post_type: draft.post_type,
          platform_instance_ids: selectedInstances, // Send selected instance IDs
          password: passwordInput, // Send the password
        }),
      });

      const data = await useResponseHandler(response);
      setPasswordInput(""); // Clear password input

      if (data.invalid || !response.ok) {
        toast.error(data.text || data.message || "Failed to publish draft.");
      } else {
        toast.success(`Draft ${draft.id} queued for publishing successfully to selected platforms! Checkout its notification for any updates.`);
        onPublishSuccess(draft.id);
        setSelectedInstances([]); // Clear selection after successful publish
      }
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("An error occurred while publishing.");
      setPasswordInput(""); // Clear password input on error as well
    } finally {
      setIsPublishing(false);
    }
  };
  
  const getPreviewContent = () => {
    if (draft.post_type === "IMAGE" && draft.image_url) {
      return <img src={draft.image_url} alt={draft.caption || "Draft image"} className="max-h-48 w-auto object-contain rounded-md mx-auto" />;
    }
    if (draft.post_type === "VIDEO" && draft.video_url) { // Assuming video_url for video posts
      return <ReactPlayer url={draft.video_url} controls width="100%" height="auto" wrapper="div" style={{ maxHeight: '200px', margin: 'auto' }} />;
    }
    return null;
  };

  const getPlatformIcon = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'instagram':
        return <FaInstagram className="mr-2 text-pink-500" />;
      case 'facebook':
        return <FaFacebook className="mr-2 text-blue-600" />;
      case 'linkedin':
        return <FaLinkedin className="mr-2 text-blue-400" />;
      default:
        return null;
    }
  };


  return (
    <>
      <Card className="mb-6 w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Draft ID: {draft.id} ({draft.post_type})</span>
            {draft.schedule && (
              <span className="text-sm font-normal text-muted-foreground flex items-center">
                <Clock size={14} className="mr-1" /> Scheduled: {new Date(draft.schedule).toLocaleString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            { (draft.post_type === "IMAGE" || draft.post_type === "VIDEO") && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-4 min-h-[150px] bg-muted/30">
                {getPreviewContent() || <span className="text-muted-foreground">No preview available</span>}
              </div>
            )}
            <div>
              <p className="font-semibold mb-1">Caption/Text:</p>
              <Textarea
                value={draft.caption || draft.text || ""}
                readOnly
                className="min-h-[100px] bg-muted/20"
              />
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-3 text-md">Publish to:</h4>
            {isLoadingInstances ? (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading platform instances...</span>
              </div>
            ) : platformInstances.length > 0 ? (
              <div className="space-y-2">
                {platformInstances.map(instance => (
                  <div key={instance.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`instance-${draft.id}-${instance.id}`}
                      checked={selectedInstances.includes(instance.id)}
                      onCheckedChange={() => handleInstanceSelection(instance.id)}
                    />
                    <Label 
                      htmlFor={`instance-${draft.id}-${instance.id}`} 
                      className="flex items-center cursor-pointer text-sm font-medium"
                    >
                      {getPlatformIcon(instance.platform)}
                      {instance.platform} - <span className="text-muted-foreground ml-1">{instance.instance_name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No platform instances found or failed to load.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" disabled> 
              <Edit3 size={16} className="mr-1" /> Edit (Soon)
          </Button>
          <Button 
              variant="destructive" 
              size="sm" 
              disabled // Add delete functionality later
          >
              <Trash2 size={16} className="mr-1" /> Delete (Soon)
          </Button>
          <Button onClick={triggerPublishFlow} disabled={isPublishing || isLoadingInstances || platformInstances.length === 0 || selectedInstances.length === 0} size="sm" className="bg-green-600 hover:bg-green-700">
            <Send size={16} className="mr-1" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Password to Publish</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your password to confirm publishing this draft. This is an added security measure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordInput("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPublish} disabled={!passwordInput || isPublishing}>
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}