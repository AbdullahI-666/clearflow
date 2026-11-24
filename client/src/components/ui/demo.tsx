import { Balloons, type BalloonsRef } from "@/components/ui/balloons"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Pencil, Trash, Copy } from "lucide-react"
import { useRef } from "react"

export function DefaultBalloonsDemo() {
  const balloonsRef = useRef<BalloonsRef | null>(null)

  const handleLaunch = () => {
    if (balloonsRef.current && 'launchAnimation' in balloonsRef.current) {
      balloonsRef.current.launchAnimation()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">      
      <Button 
        onClick={handleLaunch}
        className="bg-blue-500 hover:bg-blue-600"
      >
        Launch Balloons! 🎈
      </Button>

      <Balloons 
        ref={balloonsRef}
        type="default"
      />
    </div>
  )
}

const DropdownMenuDemo = () => {
  return (
    <DropdownMenu
      options={[
        {
          label: "Edit",
          onClick: () => console.log("Edit"),
          Icon: <Pencil className="h-4 w-4" />,
        },
        {
          label: "Duplicate",
          onClick: () => console.log("Duplicate"),
          Icon: <Copy className="h-4 w-4" />,
        },
        {
          label: "Delete",
          onClick: () => console.log("Delete"),
          Icon: <Trash className="h-4 w-4" />,
        },
      ]}
    >
      Options
    </DropdownMenu>
  );
};

export { DropdownMenuDemo }
export default DropdownMenuDemo;
