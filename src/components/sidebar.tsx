import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

import Logo from "../components/Images/Logo.png"
import {ModeToggle} from "../components/mode-toggle";



function Sidebar() {
    return ( 
        <Sheet>
        <SheetTrigger className="p-2">
          <Menu size={24} />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
            <div>
            <img src={Logo} alt="Logo" width={180} height={180} className="mx-auto"/>
            </div>
            <div className="flex justify-center">
            <ModeToggle/>
            </div>
        </SheetContent>
      </Sheet>
     );
}

export default Sidebar;