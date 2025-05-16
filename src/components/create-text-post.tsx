import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { DateTimePicker } from "./ui/datetime-picker"
import { toast } from "sonner"
import conf from "@/conf"
import useResponseHandler from "@/hooks/useResponseHandler"

export default function CreateTextPost() {
  const [text, setText] = useState("")
  const [scheduleDateTime, setScheduleDateTime] = useState<Date | undefined>(undefined)

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!text) {
      toast.error("Please enter some text") 
      return
    }    
    fetch(`${conf.api_url}/post/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
      },
      body: JSON.stringify({ content:text, schedule:scheduleDateTime, post_type:"TEXT" }),
    })
    .then((res) => useResponseHandler(res))
    .then((data) => {
      if (data.invalid) {
        toast.error(data.message)
        return
      }

      toast.success("Draft created successfully, confirm to publish")
      setText("")
      setScheduleDateTime(undefined)
    })
  }

  return (
    <div className="container py-6 px-6 ">
          <form onSubmit={handleSubmit}>
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

            </div>
            <DateTimePicker placeholder="Schedule" onChange={setScheduleDateTime} />
          </div>
        </CardContent>
        <div>
            <div className="px-6">
          <Button className="bg-pink-500 hover:bg-pink-600 w-full" type="submit">Create Draft</Button>
            </div>
        </div>
      </Card>
                </form>
    </div>
  )
}