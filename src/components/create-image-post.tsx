"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Facebook, Instagram, Linkedin, Twitter, Upload } from "lucide-react"
import { DateTimePicker } from "./ui/datetime-picker"
import { toast } from "sonner"
import conf from "@/conf"
import useResponseHandler from "@/hooks/useResponseHandler"

export default function CreateImagePost() {

  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [scheduleDateTime, setScheduleDateTime] = useState<Date | undefined>(undefined)

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
    formData.append("post_type", "IMAGE");
    
    fetch(`${conf.api_url}/post/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
        },
        body: formData
    })
    .then((res) => useResponseHandler(res))
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
  const handleImageUpload = (e) => {
    setImage(e.target.files[0]);
  };

  return (
    <div className="container py-6 px-6 ">
      <form onSubmit={handleSubmit}>

      <Card className="mb-6">
        <p className="px-6 font-extralight text-sm">
        Create an Image post with caption
        </p>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 min-h-[200px]">
              {image ? (
                <div className="relative w-full h-[200px]">
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Upload className="h-10 w-10 mb-2" />
                  <p>Image</p>
                  
                  <label htmlFor="image-upload" className="mt-2">
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      Upload
                      <input
                    type="file"
                    accept="image/*"
                    placeholder="none"                    
                    id="image-upload"
                    onChange={handleImageUpload}
                  />
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
              <DateTimePicker placeholder="Schedule" onChange={ setScheduleDateTime} />
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