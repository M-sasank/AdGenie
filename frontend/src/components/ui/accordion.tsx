
import * as React from "react";
import { Disclosure } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

import { cn } from "@/lib/utils";

// Simple wrapper to maintain the same API shape
const Accordion = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
);

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("border-b", className)} {...props}>
    {children}
  </div>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, children, ...props }, ref) => (
  <Disclosure.Button
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between py-4 font-medium transition-all hover:underline focus:outline-none",
      className
    )}
    {...props}
  >
    <span>{children}</span>
    <ChevronRightIcon className="h-5 w-5 text-gray-500 ui-open:rotate-90 transform transition-transform duration-200" />
  </Disclosure.Button>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Disclosure.Panel
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all pl-6 pb-4 pt-0",
      className
    )}
    {...props}
  >
    {children}
  </Disclosure.Panel>
));
AccordionContent.displayName = "AccordionContent";

// Usage should now be
// <Accordion>
//   <Disclosure as={AccordionItem}>
//     <AccordionTrigger>Trigger</AccordionTrigger>
//     <AccordionContent>Content</AccordionContent>
//   </Disclosure>
// </Accordion>

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
