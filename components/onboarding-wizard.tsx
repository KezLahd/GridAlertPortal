"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInput } from "@/components/phone-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Check } from "lucide-react"

interface OnboardingWizardProps {
  profile: {
    first_name: string | null
    last_name: string | null
    email: string | null
    mobile: string | null
    notify_outage_types: string[]
    notify_providers: string[]
    notify_channels: string[]
    region_access: string[]
  }
  onUpdate: (updates: Partial<OnboardingWizardProps["profile"]>) => void
  onComplete: () => void
}

const providerOptions = [
  { value: "Ausgrid", label: "Ausgrid", color: "bg-blue-500" },
  { value: "Endeavour", label: "Endeavour", color: "bg-green-500" },
  { value: "Energex", label: "Energex", color: "bg-cyan-500" },
  { value: "Ergon", label: "Ergon", color: "bg-red-500" },
  { value: "SA Power", label: "SA Power", color: "bg-orange-500" },
  { value: "Horizon Power", label: "Horizon Power", color: "bg-rose-500" },
  { value: "WPower", label: "WPower", color: "bg-amber-500" },
  { value: "AusNet", label: "AusNet", color: "bg-emerald-500" },
  { value: "CitiPowerCor", label: "CitiPowerCor", color: "bg-blue-500" },
  { value: "Essential Energy", label: "Essential Energy", color: "bg-orange-500" },
  { value: "Jemena", label: "Jemena", color: "bg-cyan-500" },
  { value: "UnitedEnergy", label: "UnitedEnergy", color: "bg-purple-500" },
  { value: "TasNetworks", label: "TasNetworks", color: "bg-purple-500" },
]

const regionOptions = ["NSW", "QLD", "VIC", "SA", "WA", "NT", "ACT", "TAS"]

export function OnboardingWizard({ profile, onUpdate, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const totalSteps = 4

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return !!profile.first_name?.trim() && !!profile.last_name?.trim()
      case 2:
        return !!profile.email?.trim() && !!profile.mobile?.trim()
      case 3:
        return profile.notify_providers.length > 0
      case 4:
        return profile.region_access.length > 0
      default:
        return false
    }
  }

  const toggleProvider = (value: string) => {
    const current = profile.notify_providers || []
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onUpdate({ notify_providers: updated })
  }

  const toggleRegion = (value: string) => {
    const current = profile.region_access || []
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onUpdate({ region_access: updated })
  }

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to GridAlert</CardTitle>
          <CardDescription>Let's set up your profile in just a few steps</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Personal Details</h3>
                  <p className="text-sm text-muted-foreground">Tell us who you are</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.first_name || ""}
                  onChange={(e) => onUpdate({ first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.last_name || ""}
                  onChange={(e) => onUpdate({ last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">How can we reach you?</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => onUpdate({ email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <PhoneInput
                  id="mobile"
                  value={profile.mobile || ""}
                  onChange={(value) => onUpdate({ mobile: value })}
                  placeholder="Enter mobile number"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Energy Providers</h3>
                  <p className="text-sm text-muted-foreground">Which providers do you want to track?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {providerOptions.map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => toggleProvider(provider.value)}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      profile.notify_providers.includes(provider.value)
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`h-12 w-12 rounded-full ${provider.color} flex items-center justify-center text-white font-bold text-lg`}
                    >
                      {provider.label[0]}
                    </div>
                    <span className="text-sm font-medium">{provider.label}</span>
                    {profile.notify_providers.includes(provider.value) && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Region Access</h3>
                  <p className="text-sm text-muted-foreground">Select the regions you want to monitor</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {regionOptions.map((region) => (
                  <label
                    key={region}
                    className={`flex items-center justify-between gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                      profile.region_access.includes(region)
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm font-medium">{region}</span>
                    <Checkbox
                      checked={profile.region_access.includes(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button onClick={nextStep} disabled={!isStepValid(step)} className="ml-auto">
            {step < totalSteps ? "Continue" : "Complete Setup"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
