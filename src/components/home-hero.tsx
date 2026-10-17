"use client";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Temporary design-system showcase. Real copy comes with next-intl (T0.3).
export function HomeHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      <h1 className="text-4xl font-bold tracking-tight">SemGen Studio</h1>
      <Card>
        <CardHeader>
          <CardTitle>Design system</CardTitle>
          <CardDescription>Primary colour, inputs and buttons.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-input">Project name</Label>
            <Input id="demo-input" placeholder="My first video" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
