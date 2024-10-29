import { Link } from "@tanstack/react-router";

import { MenuIcon } from "lucide-react";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 bg-primary backdrop-blur supports-[backdrop-filter]:bg-primary/90">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-bold">
            BetterNews
          </Link>
          <nav className="flex items-center gap-4 max-md:hidden">
            <Link className="hover:underline">new</Link>
            <Link className="hover:underline">top</Link>
            <Link className="hover:underline">submit</Link>
          </nav>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="md:hidden">
              <MenuIcon className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="mb-2">
            <SheetHeader>
              <SheetTitle>BetterNews</SheetTitle>
              <SheetDescription className="sr-only">
                Navigation
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-4">
              <Link className="hover:underline">new</Link>
              <Link className="hover:underline">top</Link>
              <Link className="hover:underline">submit</Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
