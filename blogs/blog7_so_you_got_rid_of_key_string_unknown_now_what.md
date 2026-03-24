
### The "Junk Drawer" Problem: When One Object have different shape

Every developer knows this trap because we all fall into it the exact same way.

You start with a beautifully simple object. Let's say it’s a `Payment`. It has an `id`, an `amount`, and a `timestamp`. It’s clean. It makes sense.

Then, reality hits. 

If the payment is via PayPal, you need to capture an email address. If it’s a credit card, you need the last four digits. If it’s a bank transfer, you need a routing number. 

Suddenly, your clean object needs to change its shape depending on what *kind* of payment it is. 

So, what do we do? We panic, and we build a junk drawer.

In TypeScript, it’s `metadata: any`. In Python, it’s `metadata: dict`. In Java, it’s a `Map<String, Object>`. 

We don't do this because we're bad engineers. We do it because the domain is messy, the deadline is Friday, and the junk drawer lets us shove the awkward data somewhere out of sight so we can keep moving.

But eventually, the junk drawer overflows. Someone gets tired of guessing what’s inside of it, and they demand a "strict contract." 

That’s when you hit the real problem: **How do you write a strict contract for an object that is lying about its identity?**

When you finally decide to clean up the `metadata` bag, you really only have two ways out.

---

### Escape Route 1: The "God Object" (aka The Honest Bag)

This is the reflex move. You take every possible field that *could* exist in any variation, and you shove them all into one giant object. 

Instead of an untyped bag, you now have an explicitly typed bag:
* `paypalEmail`
* `cardLastFour`
* `bankRoutingNumber`
* `isRetryable`
* `httpStatusCode`

**Why we do it:** It’s easy. Your JSON parser loves it. You don't have to learn advanced type-system gymnastics. You just fill in the fields you need and leave the rest as `null`.

**The hangover:** You’ve fixed the structure, but you’ve ruined the meaning. Your data is now legally allowed to make zero sense. 

Under this model, it is perfectly valid to have an object where `type = "paypal"` but the payload contains a `bankRoutingNumber` and an `httpStatusCode`. Maybe your code ignores the garbage data today. But six months from now, a junior developer is going to read that database row and wonder, *"Why does this PayPal transaction have a 404 status code?"*

The God Object protects your compiler, but it doesn't protect your domain.

---

### Escape Route 2: The Honest Variants

The second option requires you to look in the mirror and admit the truth: **This isn't one object wearing different hats. It's three distinct objects wearing a trench coat.**

Instead of one giant object with 30 nullable fields, you build variants. 

* A PayPal object gets PayPal fields.
* A Credit Card object gets Credit Card fields. 
* A Bank object gets Bank fields. 

In modern languages, this is called a **Discriminated Union** (or sealed classes/interfaces). You use a single field—like `type = "paypal"`—as the bouncer at the door. If the type is PayPal, the compiler absolutely forbids you from sneaking a `cardNumber` inside.

**Why it hurts:** It feels fussy at first. It requires more boilerplate. Producers will complain because they actually have to format their payloads correctly instead of just dumping everything into a JSON blob.

**Why it saves your life:** Because it eliminates "impossible states." If a payload makes it into your system, you know exactly what it is. The shape of the object *is* the documentation. 

---

# Escape Route 3 : AJV, Json schema, And schema validation



### So, which poison do you pick?

Don't let anyone tell you that "Polymorphism is always better." That's textbook nonsense. Choose the tool for the job.

**Build the God Object if:**
* You are just transporting data quickly from Point A to Point B.
* The system doesn't make deep, complex decisions based on the payload.
* You are migrating legacy code and just need to stop the bleeding of `any` types.

**Build the Honest Variants if:**
* This object is going to be stored in a database for years.
* Other teams are going to consume this API and build logic around it.
* If the data is wrong, something expensive or embarrassing happens.

When you kill the `metadata` junk drawer, you are trading "easy" for "predictable." The God Object gives you a predictable structure. Variants give you a predictable reality. 

