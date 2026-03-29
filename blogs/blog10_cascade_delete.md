# # What things need to be keep in mind when desginig an user account deletion scenario when most of the things are dependent on user account / linked to user account?

# When to use cascade delete ? when to use it vs when explicit matters?

# Why llm generated raw sqls for each delete statement for user deletion instead of cascading deleting those who depenend on main user entity?

# How not to use llm? Like if you as user already have faulty assumption then llm says yeah you are right and do things? but instead you should ask them the tradeoffs of it.

# Industry standard on how to delete all user related things if user account itself is deleted?

## Best balance is db cascade for leaf ownership i.e directly dependent and can afford cascade delete.
