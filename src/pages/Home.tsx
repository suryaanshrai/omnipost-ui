import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { FacebookIcon, XIcon, LinkedinIcon, InstagramIcon, Menu, Upload, Trash, Edit, Send, Image as ImageIcon } from "lucide-react";

export default function HomePage() {
  const [image, setImage] = useState<string | null>(null);
  const placeholderImage = "https://picsum.photos/200/300?grayscale";

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrl = () => {
    const url = prompt("Enter image URL:");
    if (url) setImage(url);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sheet>
        <SheetTrigger className="p-2">
          <Menu size={24} />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">Sidebar Content</SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex justify-center items-center p-6">
        <Card className="w-full max-w-4xl p-4 shadow-lg flex flex-col gap-4">
          <CardContent className="flex gap-4">
            {/* Image Section */}
            <div 
              className="w-1/3 bg-gray-200 flex justify-center items-center border rounded-xl overflow-hidden cursor-pointer"
              onClick={handleImageUrl}
            >
              <img src={image || placeholderImage} alt="Uploaded" className="w-full h-full object-cover" />
              <Input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Description Box */}
            <div className="w-2/3 flex flex-col gap-2">
              <Textarea placeholder="Enter description..." className="h-32 resize-none" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1"><Edit size={16} /> Edit</Button>
                <Button variant="outline" className="flex-1"><Trash size={16} /> Delete</Button>
                <Button variant="outline" className="flex-1"><Send size={16} /> Share</Button>
              </div>
            </div>
          </CardContent>

          {/* Bottom Section */}
          <div className="flex justify-between items-center px-4">
            <div className="flex gap-2">
              <FacebookIcon size={24} className="cursor-pointer" />
              <XIcon size={24} className="cursor-pointer" />
              <LinkedinIcon size={24} className="cursor-pointer" />
              <InstagramIcon size={24} className="cursor-pointer" />
            </div>
            <Button className="bg-blue-500 text-white">Create Post</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
