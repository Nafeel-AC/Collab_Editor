## -- We are using jwt as a middleware for authentication

## -- two tokens are created in cookies

## -- accesstoken

## -- refreshtoken

## socket io auth only works for the first time on connection

**Pending**

## Nafeel needs to handle cookies on the front end

## Don't auto connect the socket io in login or landing page

# Only connect the socket io after the user login verified response has been obtained.

## also send the jwt accesstoken with connection request.

```
   const socket = io("http://localhost:3001", {
   auth: {
     token: jwtTokenFromLogin
   },
   autoConnect: false // connect manually
   });
```

```socket.connect(); // Called only AFTER login

```

```

```
