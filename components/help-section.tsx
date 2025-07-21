"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Search, HelpCircle, MessageSquare, Phone } from "lucide-react"

// Sample help data - in a real app, this would come from the database
const helpData = {
  parent: [
    {
      category: "Account",
      articles: [
        {
          id: "1",
          title: "How do I update my profile?",
          content:
            "To update your profile, go to the Profile section from the navigation menu. You can edit your personal information, update your address, and change your profile picture.",
        },
        {
          id: "2",
          title: "How do I add a child to my account?",
          content:
            "You can add a child to your account during registration. If you need to add a child later, please contact our support team.",
        },
      ],
    },
    {
      category: "Rides",
      articles: [
        {
          id: "3",
          title: "How do I request a ride?",
          content:
            "To request a ride, go to the 'Request Ride' tab on your dashboard. Fill in the pickup and dropoff details, select the date and time, and submit your request.",
        },
        {
          id: "4",
          title: "What is the OTP and how do I use it?",
          content:
            "The OTP (One-Time Password) is a 6-digit code generated for each ride. Share this code with your child. The driver will need this code to start the ride, ensuring only authorized drivers can transport your child.",
        },
        {
          id: "5",
          title: "How do I track my child's ride?",
          content:
            "Once a ride is in progress, you can track it in real-time from the 'Active Rides' tab on your dashboard. You'll see the driver's current location and estimated arrival time.",
        },
      ],
    },
    {
      category: "Payments",
      articles: [
        {
          id: "6",
          title: "How do I add funds to my wallet?",
          content:
            "Go to the Wallet section on your dashboard. Click on 'Add Funds' and enter the amount you wish to add. Follow the payment instructions to complete the transaction.",
        },
        {
          id: "7",
          title: "How much does a ride cost?",
          content:
            "Ride costs vary based on distance. When you request a ride, you'll see the estimated fare before confirming. The final amount will be deducted from your wallet after the ride is completed.",
        },
      ],
    },
  ],
  driver: [
    {
      category: "Account",
      articles: [
        {
          id: "8",
          title: "How do I update my profile?",
          content:
            "To update your profile, go to the Profile section from the navigation menu. You can edit your personal information, update your address, and change your profile picture.",
        },
        {
          id: "9",
          title: "How do I update my vehicle information?",
          content:
            "Go to the Profile section and select the 'Vehicle Information' tab. You can update your car details including make, model, color, and registration number.",
        },
      ],
    },
    {
      category: "Rides",
      articles: [
        {
          id: "10",
          title: "How do I accept ride requests?",
          content:
            "Ride requests appear in the 'Ride Requests' tab on your dashboard. Review the details and click 'Accept' if you want to take the ride.",
        },
        {
          id: "11",
          title: "How do I verify the OTP?",
          content:
            "When you arrive to pick up a child, ask them for the 6-digit OTP provided by their parent. Enter this code in the OTP verification screen to start the ride.",
        },
        {
          id: "12",
          title: "How do I navigate to the pickup and dropoff locations?",
          content:
            "The app provides built-in navigation. Click on 'Show Map' or 'Navigate' to get directions to the pickup and dropoff locations.",
        },
      ],
    },
    {
      category: "Payments",
      articles: [
        {
          id: "13",
          title: "How do I get paid?",
          content:
            "Payment is automatically added to your wallet after completing a ride. You can withdraw funds from your wallet to your bank account.",
        },
        {
          id: "14",
          title: "How do I withdraw funds from my wallet?",
          content:
            "Go to the Wallet section on your dashboard. Click on 'Withdraw Funds', enter the amount, and follow the instructions to transfer the money to your bank account.",
        },
      ],
    },
  ],
}

interface HelpSectionProps {
  userType: "parent" | "driver"
}

export default function HelpSection({ userType }: HelpSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredArticles, setFilteredArticles] = useState<any[]>([])
  const articles = helpData[userType]

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredArticles([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results: any[] = []

    articles.forEach((category) => {
      const matchingArticles = category.articles.filter(
        (article) => article.title.toLowerCase().includes(query) || article.content.toLowerCase().includes(query),
      )

      if (matchingArticles.length > 0) {
        results.push({
          category: category.category,
          articles: matchingArticles,
        })
      }
    })

    setFilteredArticles(results)
  }, [searchQuery, articles])

  const handleStartChat = () => {
    window.open("https://wa.me/qr/ON5LZCGKXOBXE1", "_blank")
  }

  const handleCallNow = () => {
    window.open("tel:0682884262", "_self")
  }

  const handleSendEmail = () => {
    window.open("mailto:support@schoolride.com", "_self")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <HelpCircle className="mr-2 h-5 w-5" />
          Help Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search for help..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery.trim() !== "" ? (
          filteredArticles.length > 0 ? (
            <div className="space-y-6">
              {filteredArticles.map((category, index) => (
                <div key={index}>
                  <h3 className="font-medium mb-2">{category.category}</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {category.articles.map((article: any) => (
                      <AccordionItem key={article.id} value={article.id}>
                        <AccordionTrigger className="text-left">{article.title}</AccordionTrigger>
                        <AccordionContent>{article.content}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-400 mt-2">Try different keywords or contact support</p>
            </div>
          )
        ) : (
          <Tabs defaultValue="faq" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="contact">Contact Us</TabsTrigger>
            </TabsList>

            <TabsContent value="faq" className="mt-4">
              <div className="space-y-6">
                {articles.map((category, index) => (
                  <div key={index}>
                    <h3 className="font-medium mb-2">{category.category}</h3>
                    <Accordion type="single" collapsible className="w-full">
                      {category.articles.map((article) => (
                        <AccordionItem key={article.id} value={article.id}>
                          <AccordionTrigger className="text-left">{article.title}</AccordionTrigger>
                          <AccordionContent>{article.content}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat Support
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Our support team is available 24/7 to assist you with any questions or issues.
                  </p>
                  <Button className="mt-3 w-full" onClick={handleStartChat}>
                    Start Chat
                  </Button>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Phone Support
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Call us at 0682884262 (Mon-Fri, 8am-6pm)</p>
                  <Button variant="outline" className="mt-3 w-full" onClick={handleCallNow}>
                    Call Now
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium">Email Support</h3>
                  <p className="text-sm text-gray-600 mt-1">Send us an email at support@schoolride.com</p>
                  <Button variant="outline" className="mt-3 w-full" onClick={handleSendEmail}>
                    Send Email
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
