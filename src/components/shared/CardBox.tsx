import React from "react";
import { Card } from "../ui/card";

interface MyAppProps {
  children: React.ReactNode;
  className?: string;
}
const CardBox: React.FC<MyAppProps> = ({ children, className }) => {
  return (
    <Card className={`card no-inset no-ring ${className} border border-ld rounded-lg w-full`}>
      {children}
    </Card>
  );

};
export default CardBox;
