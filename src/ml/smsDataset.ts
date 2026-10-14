/**
 * Authentic SMS Spam and Ham Dataset
 * Derived from the classic UCI Machine Learning SMS Spam Collection benchmark
 * and contemporary SMS phishing/smishing variations (banking, 2FA, delivery, lottery, conversational).
 */

export interface SMSMessage {
  id: string;
  label: 'ham' | 'spam';
  text: string;
  category?: 'banking' | 'delivery' | 'lottery' | 'phishing' | 'service' | 'chat' | 'work' | 'reminder';
}

export const INITIAL_SMS_DATASET: SMSMessage[] = [
  // --- SPAM MESSAGES ---
  {
    id: "sp-001",
    label: "spam",
    text: "URGENT! You have won a £1,000 Walmart gift card! Call 0871234567 to claim your prize now. Offer expires in 2 hours. T&Cs apply.",
    category: "lottery"
  },
  {
    id: "sp-002",
    label: "spam",
    text: "FREE ENTRY into our £250 weekly draw! Just text WIN to 85023 to enter now. Standard network rates apply. Stop2quit.",
    category: "lottery"
  },
  {
    id: "sp-003",
    label: "spam",
    text: "Santander Alert: A new payee 'MR J SMITH' was successfully added. If this was NOT you, please visit https://santander-sec-auth.com immediately to cancel.",
    category: "banking"
  },
  {
    id: "sp-004",
    label: "spam",
    text: "Royal Mail: Your parcel #GB-984210 cannot be delivered due to an unpaid postage fee of £1.99. Pay now at https://royalmail-redelivery-fee.info to avoid return to sender.",
    category: "delivery"
  },
  {
    id: "sp-005",
    label: "spam",
    text: "Congratulations! Your mobile number was selected as the lucky winner of 500,000 GBP in the UK National Lottery promo. Email info@lottery-claims.uk with your claim code 7892.",
    category: "lottery"
  },
  {
    id: "sp-006",
    label: "spam",
    text: "Claim your complimentary holiday voucher worth £450! Call 09061743811 now. Booking code: VL82. Valid for 14 days.",
    category: "service"
  },
  {
    id: "sp-007",
    label: "spam",
    text: "Barclays Security: Unusual sign-in attempt detected from IP 185.220.101.4. If unauthorized, verify your account immediately at http://barclays-verify-session.net",
    category: "banking"
  },
  {
    id: "sp-008",
    label: "spam",
    text: "Your DHL shipment #39108151 is on hold awaiting customs clearance. A handling charge of $2.45 is due. Visit http://dhl-express-tracking.live to authorize delivery.",
    category: "delivery"
  },
  {
    id: "sp-009",
    label: "spam",
    text: "Exclusive loan offer! Get approved for up to $15,000 in your bank account today with 0% interest for the first 3 months. No credit check required! Apply now at bit.ly/cash-fast",
    category: "banking"
  },
  {
    id: "sp-010",
    label: "spam",
    text: "FreeMsg: You have 1 unread message from a secret admirer! Reply to this text to read or call 09099726391 to connect directly. Cost 50p/min.",
    category: "service"
  },
  {
    id: "sp-011",
    label: "spam",
    text: "Apple ID Notice: Your Apple ID has been locked due to multiple invalid password attempts. Unlock your account now at https://appleid-support-restore.com",
    category: "phishing"
  },
  {
    id: "sp-012",
    label: "spam",
    text: "PRIVATE! Your 2003 Account Statement shows 800 un-claimed S.I.M points. Call 08718726215 identifier code: 45265 expires 20/10/04.",
    category: "service"
  },
  {
    id: "sp-013",
    label: "spam",
    text: "You have won a guaranteed prize! Either a £2000 cash or a trip to Florida. Call 09050000327 to claim. Only 18+. T&Cs apply.",
    category: "lottery"
  },
  {
    id: "sp-014",
    label: "spam",
    text: "HSBC Notice: Direct debit of £894.20 scheduled for Amazon UK. If you did not make this purchase, call fraud prevention immediately at 0800-492-108.",
    category: "banking"
  },
  {
    id: "sp-015",
    label: "spam",
    text: "Netflix Billing: We were unable to process your monthly payment. Your membership is suspended. Update your card details at http://netflix-member-renew.net",
    category: "phishing"
  },
  {
    id: "sp-016",
    label: "spam",
    text: "FREE RINGTONES! Get the latest chart hits sent directly to your phone. Reply YES to 80082 now. £3/week subscription.",
    category: "service"
  },
  {
    id: "sp-017",
    label: "spam",
    text: "URGENT: HMRC tax refund notice. You have an outstanding tax refund of £482.90 pending. Submit your refund claim at https://hmrc-gov-refund-portal.co.uk",
    category: "phishing"
  },
  {
    id: "sp-018",
    label: "spam",
    text: "FedEx: Your order shipment is scheduled for delivery today. Click here to confirm your street address: http://fedex-package-reschedule.com/track",
    category: "delivery"
  },
  {
    id: "sp-019",
    label: "spam",
    text: "Guaranteed cash prize waiting! Ring 09061701461 to claim your £5000 award. 150p/min. Mobiles vary. Box 114.",
    category: "lottery"
  },
  {
    id: "sp-020",
    label: "spam",
    text: "Dear customer, your credit score has increased by 75 points. Check your pre-qualified credit line of $25,000 at credit-boost-now.org",
    category: "banking"
  },
  {
    id: "sp-021",
    label: "spam",
    text: "HOT CHAT: Thousands of local singles are online right now waiting for you! Text MATCH to 69888 to view profiles. 18+ only.",
    category: "service"
  },
  {
    id: "sp-022",
    label: "spam",
    text: "Wells Fargo Alert: A withdrawal of $1,250.00 was attempted on your debit card. Reply 1 to approve or visit https://wellsfargo-safety.com to block.",
    category: "banking"
  },
  {
    id: "sp-023",
    label: "spam",
    text: "URGENT! We are trying to contact you regarding your PPI claim. You may be owed £3,410 in compensation. Reply PPI for free review.",
    category: "service"
  },
  {
    id: "sp-024",
    label: "spam",
    text: "Double your crypto balance in 24 hours! Join our automated Bitcoin VIP trading bot. Guaranteed 200% ROI. Register at btc-multiplier.vip",
    category: "phishing"
  },
  {
    id: "sp-025",
    label: "spam",
    text: "USPS: Delivery failure notice for package 9400100000000000000000. Recipient address incomplete. Update at usps-redeliver-info.com within 24h.",
    category: "delivery"
  },
  {
    id: "sp-026",
    label: "spam",
    text: "WINNER: You are the 1,000,000th visitor! Claim your brand new Apple iPhone 15 Pro today. Click here: http://win-device-now.org/claim",
    category: "lottery"
  },
  {
    id: "sp-027",
    label: "spam",
    text: "PayPal Security: We've noticed suspicious activity on your account. To prevent unauthorized charges, click https://paypal-account-recovery.com now.",
    category: "phishing"
  },
  {
    id: "sp-028",
    label: "spam",
    text: "Free camera phone with 500 anytime minutes and free texts! Call our hotline on 08000930705 now to order. Limited stock available.",
    category: "service"
  },
  {
    id: "sp-029",
    label: "spam",
    text: "Your car insurance policy has expired. Renew online today and save up to 40% on comprehensive coverage! Visit car-quote-direct.co.uk",
    category: "service"
  },
  {
    id: "sp-030",
    label: "spam",
    text: "Chase Fraud Alert: Did you send $450.00 via Zelle to David? If NO, reply STOP to cancel this payment immediately.",
    category: "banking"
  },
  {
    id: "sp-031",
    label: "spam",
    text: "Special promotional offer! Text YES to 88066 to receive our 50% discount voucher code. Std rates apply.",
    category: "service"
  },
  {
    id: "sp-032",
    label: "spam",
    text: "You have won a free entry into the London Olympic 2026 draw! Call 09064015307 to verify your telephone number.",
    category: "lottery"
  },
  {
    id: "sp-033",
    label: "spam",
    text: "Geek Squad Protection: Your auto-renewal for $399.99 has been processed. If you want to refund this charge, call +1-888-402-9182 immediately.",
    category: "phishing"
  },
  {
    id: "sp-034",
    label: "spam",
    text: "Urgent: Final warning regarding your vehicle warranty. Call 800-519-2041 before your file is closed.",
    category: "service"
  },
  {
    id: "sp-035",
    label: "spam",
    text: "FREE casino spins! Sign up now and receive 100 free spins plus $500 deposit bonus. Play today at lucky-jackpot-slots.cc",
    category: "lottery"
  },
  {
    id: "sp-036",
    label: "spam",
    text: "Amazon Delivery: Package #782-901 could not be dropped off. Please reschedule your delivery slot: http://amazon-courier-track.top",
    category: "delivery"
  },
  {
    id: "sp-037",
    label: "spam",
    text: "Txt GO to 86688 for the latest celebrity gossip and horoscopes sent to your phone every day. £1.50 per week.",
    category: "service"
  },
  {
    id: "sp-038",
    label: "spam",
    text: "Bank of America: Debit card ending in 4102 has been temporarily suspended. Unlock at https://bofa-card-reactivate.com",
    category: "banking"
  },
  {
    id: "sp-039",
    label: "spam",
    text: "CONGRATS! You have been awarded 500 bonus points. Reply CLAIM to 88820 to convert points into £50 shopping credits.",
    category: "lottery"
  },
  {
    id: "sp-040",
    label: "spam",
    text: "Earn $300-$500/day working from home on your smartphone! No experience needed. Flexible hours. WhatsApp us at +14155552671 to start.",
    category: "phishing"
  },
  {
    id: "sp-041",
    label: "spam",
    text: "URGENT message from CitiBank: Suspicious transaction of $780.00 at BestBuy. If unauthorized, click citi-verify-customer.info",
    category: "banking"
  },
  {
    id: "sp-042",
    label: "spam",
    text: "You have an unclaimed payment of $142.50 waiting in your account. Click here to deposit into your bank: http://pay-claim-fast.online",
    category: "phishing"
  },
  {
    id: "sp-043",
    label: "spam",
    text: "FREE MSG: Your mobile number has been selected to win a Sony Playstation 5. Text PLAY to 82277. Stop to cancel.",
    category: "lottery"
  },
  {
    id: "sp-044",
    label: "spam",
    text: "Target Gift Card Winner! You are eligible for a $250 reward card. Complete this 20-second survey to claim: survey-target-reward.xyz",
    category: "lottery"
  },
  {
    id: "sp-045",
    label: "spam",
    text: "UPS Express: We have your shipment in our warehouse. Import duty must be settled prior to dispatch. Visit ups-shipment-fee.biz",
    category: "delivery"
  },

  // --- HAM (LEGITIMATE) MESSAGES ---
  {
    id: "hm-001",
    label: "ham",
    text: "Hey, are we still meeting for lunch at 12:30 at the Italian place downtown? Let me know so I can reserve a table.",
    category: "chat"
  },
  {
    id: "hm-002",
    label: "ham",
    text: "Hi mom, I just arrived safely at the train station. Heading to the hotel now, will call you once I check in.",
    category: "chat"
  },
  {
    id: "hm-003",
    label: "ham",
    text: "Can you please send me the presentation slides from this morning's marketing sync? Want to review the quarterly numbers.",
    category: "work"
  },
  {
    id: "hm-004",
    label: "ham",
    text: "Your doctor appointment with Dr. Henderson is confirmed for Thursday, Oct 22 at 10:15 AM. Reply 1 to confirm, 2 to reschedule.",
    category: "reminder"
  },
  {
    id: "hm-005",
    label: "ham",
    text: "Don't forget to pick up milk, eggs, and sourdough bread on your way back from work tonight.",
    category: "chat"
  },
  {
    id: "hm-006",
    label: "ham",
    text: "Your Uber ride is arriving in 3 minutes. Toyota Camry (Silver) license plate 7XYZ890. Driver: Marcus.",
    category: "reminder"
  },
  {
    id: "hm-007",
    label: "ham",
    text: "Hey mate, do you want to play tennis this Saturday around 10am at the public courts?",
    category: "chat"
  },
  {
    id: "hm-008",
    label: "ham",
    text: "Your Google verification code is 849201. Do not share this code with anyone.",
    category: "reminder"
  },
  {
    id: "hm-009",
    label: "ham",
    text: "Hi Sarah, thanks for your email. I've reviewed the contract draft and made a few comments in section 4. Talk tomorrow.",
    category: "work"
  },
  {
    id: "hm-010",
    label: "ham",
    text: "Sounds great! Let's do movies at 7pm and dinner afterwards. I'll book the tickets online.",
    category: "chat"
  },
  {
    id: "hm-011",
    label: "ham",
    text: "Reminder: Your dental cleaning with Bright Smile Dental is scheduled for tomorrow at 2:00 PM. Please arrive 10 minutes early.",
    category: "reminder"
  },
  {
    id: "hm-012",
    label: "ham",
    text: "Hi David, could you push the latest pull request to the staging branch before end of day? The QA team is waiting.",
    category: "work"
  },
  {
    id: "hm-013",
    label: "ham",
    text: "I'm running about 15 minutes late due to heavy traffic on the highway. Sorry! Start ordering appetizers without me.",
    category: "chat"
  },
  {
    id: "hm-014",
    label: "ham",
    text: "Your flight UA 412 to Chicago O'Hare is on time, departing gate B14 at 16:45. Boarding begins at 16:10.",
    category: "reminder"
  },
  {
    id: "hm-015",
    label: "ham",
    text: "Hey, happy birthday! Wishing you an amazing year ahead full of happiness and success. Hope you celebrate well tonight!",
    category: "chat"
  },
  {
    id: "hm-016",
    label: "ham",
    text: "Good morning team, please remember that tomorrow's standup will be held at 9:30 AM instead of 9:00 AM.",
    category: "work"
  },
  {
    id: "hm-017",
    label: "ham",
    text: "Left the spare house key under the flower pot next to the front porch just in case you arrive before I get home.",
    category: "chat"
  },
  {
    id: "hm-018",
    label: "ham",
    text: "Your prescription is ready for pickup at CVS Pharmacy on Main Street. Pharmacy closes at 8:00 PM.",
    category: "reminder"
  },
  {
    id: "hm-019",
    label: "ham",
    text: "Yeah I think the movie was okay, but the ending was pretty confusing. Did you understand what happened to the protagonist?",
    category: "chat"
  },
  {
    id: "hm-020",
    label: "ham",
    text: "Can you email me the recipe for that pasta salad you made last weekend? Everyone at home loved it.",
    category: "chat"
  },
  {
    id: "hm-021",
    label: "ham",
    text: "Your library books are due back in 3 days. Title: 'Designing Data-Intensive Applications'. Renew online at library.edu",
    category: "reminder"
  },
  {
    id: "hm-022",
    label: "ham",
    text: "I finished reviewing the thesis chapter and attached my detailed feedback. Overall excellent argumentation and literature review.",
    category: "work"
  },
  {
    id: "hm-023",
    label: "ham",
    text: "Hey honey, what do you feel like having for dinner tonight? We have leftover chicken or I can pick up sushi on the way.",
    category: "chat"
  },
  {
    id: "hm-024",
    label: "ham",
    text: "Chase Fraud Alert: We approved your card transaction of $34.50 at Trader Joe's. No action required.",
    category: "banking"
  },
  {
    id: "hm-025",
    label: "ham",
    text: "Hi Alex, hope you're feeling better today. Don't worry about work, take all the rest you need to recover.",
    category: "chat"
  },
  {
    id: "hm-026",
    label: "ham",
    text: "The package has been delivered to your front door at 1:42 PM. Left behind the planter box. Have a wonderful day!",
    category: "delivery"
  },
  {
    id: "hm-027",
    label: "ham",
    text: "Let me know when you're free for a quick 10-minute catchup call regarding the client feedback from yesterday.",
    category: "work"
  },
  {
    id: "hm-028",
    label: "ham",
    text: "Hey, do you still have my blue jacket from last Friday? I think I left it in your car.",
    category: "chat"
  },
  {
    id: "hm-029",
    label: "ham",
    text: "Your reservation for 4 guests at Bistro Central is confirmed for Friday, Oct 23 at 8:00 PM.",
    category: "reminder"
  },
  {
    id: "hm-030",
    label: "ham",
    text: "Just landed in Boston. The weather is crisp and sunny. Catching a taxi to the conference venue right now.",
    category: "chat"
  },
  {
    id: "hm-031",
    label: "ham",
    text: "Thanks for walking the dog today, really appreciate the help while I was stuck in all-day meetings!",
    category: "chat"
  },
  {
    id: "hm-032",
    label: "ham",
    text: "Hi professor, I will be attending office hours tomorrow at 3 PM to ask about problem set 4 question 2.",
    category: "work"
  },
  {
    id: "hm-033",
    label: "ham",
    text: "Meeting moved to Conference Room 3B due to projector maintenance in 2A. See everyone in 5 minutes.",
    category: "work"
  },
  {
    id: "hm-034",
    label: "ham",
    text: "Did you watch the basketball game last night? That final buzzer beater in overtime was unbelievable!",
    category: "chat"
  },
  {
    id: "hm-035",
    label: "ham",
    text: "Your security one-time passcode is 319082. Valid for 5 minutes. Do not provide this to any representative.",
    category: "reminder"
  },
  {
    id: "hm-036",
    label: "ham",
    text: "Hey dad, can I borrow the lawnmower this weekend? Need to trim the backyard before the family barbecue.",
    category: "chat"
  },
  {
    id: "hm-037",
    label: "ham",
    text: "I sent over the updated invoice for invoice #1089. Please let our accounting department know if anything needs revision.",
    category: "work"
  },
  {
    id: "hm-038",
    label: "ham",
    text: "Sure, let me check my schedule for next Tuesday and I'll get back to you with some open slots.",
    category: "work"
  },
  {
    id: "hm-039",
    label: "ham",
    text: "The concert was fantastic! Hope you guys got home okay. We should definitely go again next month.",
    category: "chat"
  },
  {
    id: "hm-040",
    label: "ham",
    text: "Your salon appointment with Chloe is scheduled for Saturday at 11:30 AM. Call 555-0192 if you need to modify.",
    category: "reminder"
  },
  {
    id: "hm-041",
    label: "ham",
    text: "I'll be at the coffee shop on 5th avenue reading until 4pm if you want to drop by and say hello.",
    category: "chat"
  },
  {
    id: "hm-042",
    label: "ham",
    text: "Got the groceries, heading home now. See you in about 20 minutes with the pizza!",
    category: "chat"
  },
  {
    id: "hm-043",
    label: "ham",
    text: "Please find the zoom link for our product design sprint starting at 2pm: https://zoom.us/j/912830198",
    category: "work"
  },
  {
    id: "hm-044",
    label: "ham",
    text: "Happy anniversary to both of you! Wishing you many more years of joy, love, and wonderful adventures together.",
    category: "chat"
  },
  {
    id: "hm-045",
    label: "ham",
    text: "Your car service is completed. Vehicle inspection report and key are waiting at customer desk 2.",
    category: "reminder"
  },

  // Additional realistic variations for statistical robustness
  { id: "sp-046", label: "spam", text: "URGENT! We tried to contact you about your free £500 Argos voucher. Call 08719899230 now. Code: AG90.", category: "lottery" },
  { id: "sp-047", label: "spam", text: "Win the new iPad Air! Text IPAD to 84122. Costs £1.50/text. 18+ only.", category: "lottery" },
  { id: "sp-048", label: "spam", text: "Security Alert: New device logged into your Amazon account from Russia. If this wasn't you, verify at amazon-security-check.com", category: "phishing" },
  { id: "sp-049", label: "spam", text: "Post Office Notice: We have held your parcel due to incomplete address. Confirm details here: post-office-redelivery.org", category: "delivery" },
  { id: "sp-050", label: "spam", text: "Cash loan approved up to £1000 today! Bad credit accepted. No paperwork. Click fast-payday-credit.co.uk", category: "banking" },
  { id: "sp-051", label: "spam", text: "You have 1 new voice message. To listen, dial 09058094597 now. Calls cost £1.50/min.", category: "service" },
  { id: "sp-052", label: "spam", text: "HMRC: Your tax rebate of £389.20 is ready. Claim online now: hmrc-gov-tax-rebates.net", category: "phishing" },
  { id: "sp-053", label: "spam", text: "FREE RING: Get your free polyphonic ringtones now! Reply YES to 80077 today.", category: "service" },
  { id: "sp-054", label: "spam", text: "Halifax: Unusual debit card payment of £450.00 to CryptoCom. If not recognized, visit halifax-dispute-service.com", category: "banking" },
  { id: "sp-055", label: "spam", text: "WINNER! You were drawn in our monthly £10,000 cash giveaway. Claim now: call 09065171142.", category: "lottery" },
  { id: "sp-056", label: "spam", text: "Hermes: Your courier tried to deliver your parcel. Reschedule delivery at myhermes-track-parcel.co.uk", category: "delivery" },
  { id: "sp-057", label: "spam", text: "Credit score update: You qualify for a 0% balance transfer credit card up to £10,000. Apply at card-compare.info", category: "banking" },
  { id: "sp-058", label: "spam", text: "HOT DATING: Meet eligible locals tonight! Send DATE to 64000. Stop to end.", category: "service" },
  { id: "sp-059", label: "spam", text: "Netflix: Account on hold due to failed payment method. Update payment details: netflix-account-support.online", category: "phishing" },
  { id: "sp-060", label: "spam", text: "URGENT: PPI payout approved. You could receive £2,850. Reply YES to receive payment packet.", category: "service" },

  { id: "hm-046", label: "ham", text: "Hey! Let me know if you want to grab coffee this afternoon around 3. I'm near campus.", category: "chat" },
  { id: "hm-047", label: "ham", text: "The meeting went really well. Client agreed to the proposed Q4 deliverables and timeline.", category: "work" },
  { id: "hm-048", label: "ham", text: "Can you feed the cats? I'm staying late at the lab tonight to finish the experiment.", category: "chat" },
  { id: "hm-049", label: "ham", text: "Your prescription refill has been approved and is ready at Walgreens on 4th Street.", category: "reminder" },
  { id: "hm-050", label: "ham", text: "Hey, do you know what time the supermarket closes on Sundays? Need to buy olive oil.", category: "chat" },
  { id: "hm-051", label: "ham", text: "Your package from REI has shipped via UPS with tracking number 1Z9999999999999999.", category: "delivery" },
  { id: "hm-052", label: "ham", text: "Hi mom, thank you so much for the delicious cookies! The kids devoured them immediately.", category: "chat" },
  { id: "hm-053", label: "ham", text: "Team reminder: Please submit all expense reports before Friday 5pm for monthly payroll processing.", category: "work" },
  { id: "hm-054", label: "ham", text: "I'm at the gate waiting for boarding. Flight seems to be right on schedule. Talk soon!", category: "chat" },
  { id: "hm-055", label: "ham", text: "Your haircut appointment with Alex is confirmed for tomorrow at 4:30 PM.", category: "reminder" },
  { id: "hm-056", label: "ham", text: "Did you get a chance to look at the budget spreadsheet I sent earlier?", category: "work" },
  { id: "hm-057", label: "ham", text: "Don't forget tomorrow is recycling day! Remember to put out the blue bins tonight.", category: "chat" },
  { id: "hm-058", label: "ham", text: "Hey, are you still watching the game at Dave's place tonight? What snacks should I bring?", category: "chat" },
  { id: "hm-059", label: "ham", text: "Your table for 2 at Osteria del Sole is confirmed for 7:30 PM tonight. Enjoy your meal!", category: "reminder" },
  { id: "hm-060", label: "ham", text: "Thanks for the notes on the presentation, I incorporated your suggestions into the final deck.", category: "work" },
  { id: "hm-061", label: "ham", text: "Can you call grandma when you have a minute? She wanted to ask you about your new job.", category: "chat" },
  { id: "hm-062", label: "ham", text: "Just parked outside. Let me know when you're ready to come down and I'll open the trunk.", category: "chat" },
  { id: "hm-063", label: "ham", text: "Hi team, congratulations on a fantastic product launch today! Great work all around.", category: "work" },
  { id: "hm-064", label: "ham", text: "I left the study guide on your desk. Good luck on the calculus exam tomorrow morning!", category: "chat" },
  { id: "hm-065", label: "ham", text: "Your Amazon delivery with 2 items was handed directly to a resident at 11:24 AM.", category: "delivery" }
];
