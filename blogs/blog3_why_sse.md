
# Why my architecture chooses sse?

# Why workers themselves not returning sse?

# why worker write to a database and java stream endpoint will listen to the tail and stream?

# What happens to SSE when user reconnects

Client silently remembers the last id it received, when the connection drops and eventsource reconnects, it sends a Last-Event-ID header with that remembered value.

Then the server can the use this header to replay every event the client missed.

