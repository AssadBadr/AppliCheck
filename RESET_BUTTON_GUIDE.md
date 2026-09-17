# 🔄 Reset Button - Clean Demo Setup

## What the Reset Button Does

The **"Reset Demo"** button now intelligently manages your applications:

✅ **Keeps these 2 default applications:**
- **Learning Workshop A** - Has 2/3 documents valid (missing signoff)
- **Community Workshop B** - Has issues with all 3 documents (name mismatch + missing docs)

❌ **Deletes everything else:**
- All test applications you submitted
- All their associated messages
- Leaves only the two default demo applications

---

## 🎯 Why This is Useful

**Perfect for demos and testing:**
1. Submit multiple test applications during development
2. Test the inbox system with various scenarios
3. When ready to demo, click **"Reset Demo"**
4. Back to clean slate with just the 2 example applications!

---

## 📋 Setup Instructions

### Step 1: Insert Default Applications (One-Time Setup)

**Only if you don't have the default applications yet:**

1. Go to Supabase SQL Editor
2. Copy and paste the SQL from `supabase/insert_default_apps.sql`
3. Click "Run"

This creates the two default demo applications in your database.

---

## 🧪 How to Test

### Test the Reset Function:

1. **Submit some test applications**:
   - Go to http://localhost:5173/apply
   - Submit 2-3 test applications with different data

2. **Check dashboard**:
   - You should see 4-5 applications total
   - (2 default + your test ones)

3. **Click "Reset Demo"**:
   - Confirms: "This will delete all applications except..."
   - Click "OK"

4. **Result**:
   - Only 2 applications remain:
     - Learning Workshop A
     - Community Workshop B
   - All test applications deleted
   - All their messages deleted

---

## 🎨 Default Applications Details

### Learning Workshop A
```
Status: Under Review
Documents:
  ✅ Registration Document - Valid
  ✅ Activity Plan - Valid
  ❌ Responsible Person Signoff - Missing
  
Good for demos: Shows partial completion (66%)
```

### Community Workshop B
```
Status: Under Review
Documents:
  ⚠️ Registration Document - Name mismatch
     "Document says 'Community Workshop C' but 
      application is for 'Community Workshop B'"
  ❌ Activity Plan - Missing
  ❌ Responsible Person Signoff - Missing
  
Good for demos: Shows multiple issues (0%)
```

---

## 💡 Demo Workflow

**Perfect demo flow using reset:**

1. **Start clean**: Click "Reset Demo"
   - Shows 2 applications with different issues

2. **Demo the review process**:
   - Select Learning Workshop A
   - Show it's 66% complete
   - Mark signoff as valid
   - Approve the application!

3. **Demo the notification system**:
   - Select Community Workshop B
   - Show multiple issues (name mismatch + missing docs)
   - Click "Notify Applicant"
   - Shows exactly what's wrong

4. **Demo applicant experience**:
   - Go to applicant inbox for Community Workshop B
   - Show the detailed notification
   - Explain what they need to fix

5. **Reset for next demo**:
   - Click "Reset Demo"
   - Back to starting state!

---

## 🔒 Safety Features

The reset button includes safety measures:

1. **Confirmation dialog**: Asks before deleting anything
2. **Preserves defaults**: Never deletes the 2 default applications
3. **Cascade deletes**: Automatically removes messages for deleted applications
4. **Success feedback**: Shows how many applications were deleted

---

## 🚨 Important Notes

**The reset button will NOT work if:**
- You're using demo data (not connected to Supabase)
- You haven't run the messages_schema.sql yet
- The default applications don't exist in Supabase

**To fix:**
1. Make sure Supabase is connected (check `.env.local`)
2. Run `supabase/messages_schema.sql` 
3. Run `supabase/insert_default_apps.sql`
4. Then test the reset button

---

## 📊 What Gets Deleted

When you click "Reset Demo":

```
✅ Keeps:
  - Learning Workshop A (and its messages)
  - Community Workshop B (and its messages)

❌ Deletes:
  - All other applications
  - All messages for deleted applications
  - Any test data you created

🔄 Result:
  Clean demo environment with just the 2 examples!
```

---

**Ready to test!** Submit some applications, then click "Reset Demo" to see it work! 🎉
