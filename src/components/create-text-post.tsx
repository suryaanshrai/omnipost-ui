"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

export default function CreateTextPost() {
  const [text, setText] = useState("")


  return (
    <div className="container py-6 px-6 ">
      <Card className="mb-6">
        <p className="px-6 font-extralight text-sm">
        Create a text post
        </p>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <Textarea
                placeholder="Enter Text..."
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