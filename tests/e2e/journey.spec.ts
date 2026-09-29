import { expect, test, type Browser, type Page } from "@playwright/test";
import postgres from "postgres";

// Full Season 1 journey in mock mode: apply → verify → pay → ID → questionnaire → voice →
// profile → matchmaker approval → season → Thursday drop → mutual accept → conversation →
// date plan → check-in → close. Needs a freshly migrated and seeded (--demo) database.

const sql = postgres(process.env.E2E_DATABASE_URL!, { max: 1, onnotice: () => {} });

test.afterAll(async () => { await sql.end(); });

async function signIn(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByRole("button", { name: "Send code" }).click();
  await verifyWithDevCode(page);
}

async function verifyWithDevCode(page: Page) {
  await page.waitForURL(/\/verify/);
  const code = new URL(page.url()).searchParams.get("dev")!;
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/app$/);
}

async function newPage(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  return ctx.newPage();
}

test("a member goes from application to a planned first date", async ({ browser }) => {
  await sql`update settings set value = '1' where key = 'min_per_side_to_open'`;
  await sql`
    insert into members (phone, first_name, birth_date, gender, seeking, pref_age_min, pref_age_max, consented_at)
    values ('254700000001', 'Matchmaker', '1990-01-01', 'woman', 'man', 25, 40, now()) on conflict (phone) do nothing`;
  const phone = `07${String(Date.now()).slice(-8)}`;

  // --- Apply
  const her = await newPage(browser);
  await her.goto("/apply");
  await her.getByLabel("First name").fill("Wanjiku");
  await her.getByLabel("M-Pesa phone number").fill(phone);
  await her.getByLabel("Date of birth").fill("1994-03-02");
  await her.getByLabel("I am a").selectOption("woman");
  await her.getByLabel("Looking to meet a").selectOption("man");
  for (const box of await her.getByRole("checkbox").all()) await box.check();
  await her.getByRole("button", { name: "Continue" }).click();
  await verifyWithDevCode(her);

  // --- Application fee via mock M-Pesa
  await her.getByRole("link", { name: "Start" }).click();
  await her.getByRole("button", { name: /Pay KES 300/ }).click();
  await her.getByRole("button", { name: "Test mode: approve payment" }).click();
  await her.waitForURL(/\/app\/identity/);

  // --- Identity
  await her.getByLabel("National ID number").fill(String(Date.now()).slice(-8));
  await her.getByRole("button", { name: "Verify my identity" }).click();
  await her.waitForURL(/\/app\/questionnaire/);

  // --- Questionnaire: first option everywhere, except stay open to partners with children
  for (const group of await her.locator("fieldset").all()) {
    await group.locator("label").first().click();
  }
  await her.getByRole("button", { name: "Save answers" }).click();
  await her.waitForURL(/\/app\/vetting/);

  // --- Vetting questions: save partway, come back, then submit
  const boxes = her.locator("textarea");
  await expect(boxes).toHaveCount(25);
  await boxes.nth(0).fill("Marriage. I have built my career and I am ready to build a home with someone.");
  await her.getByRole("button", { name: "Save progress" }).click();
  await expect(her.getByText(/Saved 1 of 25/)).toBeVisible();
  await her.getByRole("button", { name: "Submit my answers" }).click();
  await expect(her.getByText(/24 answers need a little more/)).toBeVisible();
  for (let i = 1; i < 25; i++) await boxes.nth(i).fill(`A considered answer number ${i}, written in my own words.`);
  await her.getByRole("button", { name: "Submit my answers" }).click();
  await her.waitForURL(/\/app\/voice/);

  // --- Voice intro: record with Chromium's fake microphone
  await her.getByRole("button", { name: "Start recording" }).click();
  await her.waitForTimeout(1500);
  await her.getByRole("button", { name: "Stop" }).click();
  await her.getByRole("button", { name: "Use this recording" }).click();
  await her.waitForURL(/\/app\/profile/);

  // --- Profile draft (template fallback, no API key) then approve
  await expect(her.locator("textarea[name=bio]")).toHaveValue(/relationship that leads to marriage/);
  await her.getByRole("button", { name: "Approve my profile" }).click();
  await her.waitForURL(/\/app$/);
  await expect(her.getByText("Usually 2 to 3 days")).toBeVisible();

  // --- Matchmaker approves the application and opens matching
  const admin = await newPage(browser);
  await signIn(admin, "0700000001");
  await admin.goto("/admin/members");
  const card = admin.locator("article", { hasText: "Wanjiku" });
  await card.getByText(/answers in their own words \(25\)/).click();
  await expect(card.getByText("Marriage. I have built my career")).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(admin.locator("article", { hasText: "Wanjiku" })).toHaveCount(0);

  // --- She starts her season
  await her.goto("/app/season");
  await her.getByRole("button", { name: /Pay KES 2,500/ }).click();
  await her.getByRole("button", { name: "Test mode: approve payment" }).click();
  await her.waitForURL(/\/app$/);
  await expect(her.getByText(/Membership active until/)).toBeVisible();

  // --- Matchmaker opens matching and approves a pair with her
  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Open matching" }).click();
  await expect(admin.getByRole("button", { name: "Pause matching" })).toBeVisible();
  await admin.goto("/admin/matching");
  const row = admin.locator("tr", { hasText: "Wanjiku" }).first();
  await row.getByRole("link", { name: "Review" }).click();
  await expect(admin.getByLabel(/Why this match/)).not.toBeEmpty();
  await admin.getByRole("button", { name: "Approve for the drop" }).click();
  await admin.waitForURL(/approved=1/);

  // --- Thursday arrives
  const [match] = await sql<{ id: string; memberA: string; memberB: string }[]>`
    select m.id, m.member_a as "memberA", m.member_b as "memberB" from matches m
    join members w on w.id in (m.member_a, m.member_b) where w.first_name = 'Wanjiku' and w.phone = ${"254" + phone.slice(1)}`;
  await sql`update matches set drop_at = now() - interval '1 minute' where id = ${match.id}`;
  const tick = await her.request.get("/api/cron/tick", { headers: { Authorization: `Bearer ${process.env.E2E_CRON_SECRET}` } });
  expect((await tick.json()).notified).toBe(2);

  // --- Both accept
  await her.goto("/app/matches");
  await her.locator("a", { hasText: "% aligned" }).first().click();
  await expect(her.getByText("Why this match")).toBeVisible();
  await her.getByRole("button", { name: "Accept" }).click();
  await expect(her.getByText(/You accepted/)).toBeVisible();

  const [himRow] = await sql<{ phone: string; firstName: string }[]>`
    select phone, first_name as "firstName" from members
    where id in (${match.memberA}, ${match.memberB}) and first_name <> 'Wanjiku'`;
  const him = await newPage(browser);
  await signIn(him, "0" + himRow.phone.slice(3));
  await him.goto(`/app/matches/${match.id}`);
  await him.getByRole("button", { name: "Accept" }).click();
  await him.waitForURL(/\/app\/conversations\//);
  const convUrl = him.url();

  // --- Stage 1: voice intros
  await him.getByRole("button", { name: "I've listened" }).click();
  await her.goto(convUrl);
  await her.getByRole("button", { name: "I've listened" }).click();

  // --- Stage 2: guided prompts
  for (const p of [her, him]) {
    await p.goto(convUrl);
    for (let i = 0; i < 3; i++) {
      await p.locator("form", { has: p.locator(`input[name=promptIndex][value="${i}"]`) }).locator("textarea").fill(`Answer ${i} from ${p === her ? "her" : "him"}`);
      await p.locator("form", { has: p.locator(`input[name=promptIndex][value="${i}"]`) }).getByRole("button", { name: "Share answer" }).click();
      await expect(p.getByText(`Answer ${i} from ${p === her ? "her" : "him"}`)).toBeVisible();
    }
  }

  // --- Stage 3: chat
  await her.goto(convUrl);
  await her.getByPlaceholder("Write a message").fill("Hi! Coffee this weekend?");
  await her.getByRole("button", { name: "Send" }).click();
  await him.goto(convUrl);
  await expect(him.getByText("Hi! Coffee this weekend?")).toBeVisible();

  // --- Gift: she sends flowers, he accepts privately, the matchmaker delivers
  await her.getByRole("link", { name: /Send .* flowers/ }).click();
  await her.getByText("A dozen red roses").click();
  await her.getByLabel("A short note (optional)").fill("For Saturday");
  await her.getByRole("button", { name: "Continue to payment" }).click();
  await her.getByRole("button", { name: /Pay KES 3,500/ }).click();
  await her.getByRole("button", { name: "Test mode: approve payment" }).click();
  await her.waitForURL(/\/app\/gifts\?sent=1/);
  await expect(her.getByText("Waiting for them to accept")).toBeVisible();

  await him.goto("/app/gifts");
  await expect(him.getByText(/sent you a dozen red roses/)).toBeVisible();
  await him.getByLabel("Area").fill("Kilimani");
  await him.getByLabel("Where to deliver").fill("Office reception, Timau Plaza");
  await him.getByRole("button", { name: "Accept gift" }).click();
  await expect(him.getByText("Accepted · being prepared")).toBeVisible();

  await admin.goto("/admin/gifts");
  await expect(admin.getByText("Timau Plaza")).toBeVisible();
  await admin.getByRole("button", { name: "Mark as dispatched" }).click();
  await admin.getByRole("button", { name: "Mark as delivered" }).click();
  await expect(admin.getByText("Nothing to deliver right now.")).toBeVisible();
  const [giftRow] = await sql<{ status: string; details: string | null }[]>`
    select status, delivery_details as details from gifts order by created_at desc limit 1`;
  expect(giftRow).toEqual({ status: "delivered", details: null });
  await her.goto("/app/gifts");
  await expect(her.getByText("Delivered", { exact: true })).toBeVisible();
  await him.goto(convUrl);

  // --- Date bridge: he suggests, she confirms
  await him.getByLabel("Partner venue").selectOption({ index: 1 });
  const soon = new Date(Date.now() + 3 * 3_600_000 + 3 * 3_600_000); // Nairobi local, 3h from now
  await him.getByLabel("Date and time").fill(soon.toISOString().slice(0, 16));
  await him.getByRole("button", { name: "Suggest this date" }).click();
  await expect(him.getByText(/Waiting for Wanjiku to confirm/)).toBeVisible();
  await her.goto(convUrl);
  await her.getByRole("button", { name: "Confirm this date" }).click();
  await expect(her.getByText(/Add a trusted contact|told your trusted contact/)).toBeVisible();

  // --- The night of the date: check in
  await sql`update date_plans set starts_at = now() - interval '10 minutes' where conversation_id = ${convUrl.split("/").pop()!}`;
  await her.goto(convUrl);
  await her.getByRole("button", { name: "I'm okay" }).click();
  await expect(her.getByText("You checked in. Thank you.")).toBeVisible();

  // --- Standing reflects it, with no hidden penalties
  await her.goto("/app/standing");
  await expect(her.getByText("Planned a date", { exact: true })).toBeVisible();
  await expect(her.getByText("Checked in after a date", { exact: true })).toBeVisible();

  // --- He closes respectfully afterwards; she sees the message
  await him.goto(convUrl);
  await him.getByRole("button", { name: "Close respectfully" }).click();
  await him.getByRole("button", { name: "Send and close" }).click();
  await expect(him.getByText("You closed this conversation respectfully")).toBeVisible();
  await her.goto(convUrl);
  await expect(her.getByText(/closed this conversation:/)).toBeVisible();

  await her.screenshot({ path: "test-results/closed-conversation.png", fullPage: true });
});

test("unauthenticated and cross-member access is refused", async ({ page, request }) => {
  await page.goto("/app");
  await page.waitForURL(/\/login/);
  expect((await request.get("/api/cron/tick")).status()).toBe(401);
  expect((await request.post("/api/mpesa/callback?token=wrong", { data: {} })).status()).toBe(401);
  const [m] = await sql<{ id: string }[]>`select id from members limit 1`;
  expect((await request.get(`/api/voice/${m.id}`)).status()).toBe(401);
  await page.goto("/admin");
  await page.waitForURL(/\/login/);
});

test("ghosting is proposed for human review and never applied automatically", async ({ browser, request }) => {
  const [a, b] = await sql<{ id: string; phone: string }[]>`
    select id, phone from members where phone in ('254799000003', '254799000010') order by id`;
  const [m] = await sql<{ id: string }[]>`
    insert into matches (member_a, member_b, score, pillars, why, drop_at, a_response, b_response, notified_at)
    values (${a.id}, ${b.id}, 80, ${sql.json({ intent: 80, values: 80, lifestyle: 80 })}, 'Test pair', now() - interval '8 days', 'accept', 'accept', now())
    on conflict (member_a, member_b) do update set score = 80 returning id`;
  const [c] = await sql<{ id: string }[]>`
    insert into conversations (match_id, opened_at, expires_at) values (${m.id}, now() - interval '8 days', now() - interval '1 hour')
    returning id`;
  await sql`insert into messages (conversation_id, sender_id, body, created_at) values (${c.id}, ${a.id}, 'Hello?', now() - interval '2 days')`;

  const tick = await request.get("/api/cron/tick", { headers: { Authorization: `Bearer ${process.env.E2E_CRON_SECRET}` } });
  expect((await tick.json()).expired).toBeGreaterThanOrEqual(1);

  const events = await sql<{ memberId: string; status: string }[]>`
    select member_id as "memberId", status from standing_events where conversation_id = ${c.id} and kind = 'ghosted'`;
  expect(events).toEqual([{ memberId: b.id, status: "proposed" }]);

  // The member sees it as under review, and their score hasn't moved.
  const page = await (await browser.newContext()).newPage();
  await signIn(page, "0" + b.phone.slice(3));
  await page.goto("/app/standing");
  await expect(page.getByText(/Under review\. Doesn't count yet/)).toBeVisible();
  await expect(page.getByText("100", { exact: true })).toBeVisible();
});
