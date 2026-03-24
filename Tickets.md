
# Change metadata shape to schema - Done
- introduce enum whenever make sense
- move from key string
to explicit contract

# Improve 11 things need your attention and 18 checks passed to blockers and other numbers too.

# BLOG-POST 5
# How llm generates code that seems to work test passed - but is entirely fake

i.e instead of emitting events as it occured my llm tried to save entire result at first then tried to stream from database after whole whole is done and it streamed row by row thats entierly fake. What we need is we needed to emit events as the worker finishes for a rule not after streaming row after all rows are saved.
