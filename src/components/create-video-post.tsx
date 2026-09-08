"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X } from "lucide-react"
import { DateTimePicker } from "./ui/datetime-picker"
import { toast } from "sonner"
import conf from "@/conf"
import handleApiResponse from '@/lib/handle-api-response';

export default function CreateVideoPost() {

  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [scheduleDateTime, setScheduleDateTime] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (!image) {
      setVideoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(image)
    setVideoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    toast.info("Creating draft...")
    if (!image) {
      toast.error("Please add an image") 
      return
    }
    const formData = new FormData()
    formData.append("media", image);
    formData.append("content", text);
    if (scheduleDateTime) {
      formData.append("schedule", scheduleDateTime.toISOString());
    }
    formData.append("post_type", "VIDEO");
    
    fetch(`${conf.api_url}/post/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
        },
        body: formData
    })
    .then((res) => handleApiResponse(res))
    .then(data => {
      if (data.invalid) {
        toast.error(data.text)
        return
      }
      toast.success("Draft created successfully, confirm to publish")
      setText("")
      setImage(null)
      setScheduleDateTime(undefined)
    })
  }
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImage(e.target.files?.[0] ?? null);
  };

  return (
    <div className="container py-6 px-6 ">
      <form onSubmit={handleSubmit}>

      <Card className="mb-6">
        <p className="px-6 font-extralight text-sm">
        Create an Video post with caption
        </p>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 min-h-[200px]">
              {image && videoPreviewUrl ? (
                <div className="relative w-full h-[200px]">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-full object-contain rounded-md"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={() => setImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Upload className="h-10 w-10 mb-2" />
                  <p>Video</p>

                  <label htmlFor="video-upload" className="mt-2">
                    <input
                      type="file"
                      accept="video/*"
                      id="video-upload"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                      <span>Upload</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <div>
              <Textarea
                placeholder="Enter description..."
                className="min-h-[200px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                />

              <div className="flex justify-between mt-4">
              <DateTimePicker placeholder="Schedule" onChange={setScheduleDateTime} />
              </div>
            </div>
          </div>
        </CardContent>
        <div>
            <div className="px-6">
          <Button className="bg-pink-500 hover:bg-pink-600 w-full">Create Draft</Button>
                </div>
        </div>
      </Card>
                </form>
    </div>
  )
}