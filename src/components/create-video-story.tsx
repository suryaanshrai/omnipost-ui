"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

export default function CreateVideoStory() {
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState("")

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="container py-6 px-6 ">
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
                  <p>Video</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="image-upload" className="mt-2">
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      Upload
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
    </div>
  )
}