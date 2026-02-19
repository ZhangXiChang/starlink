//@refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, scripts, children }) => (
      <html data-theme="light">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width,initial-scale=1.0"
          />
          <link rel="icon" href="/icon.svg" />
          <title>噗噗</title>
          {assets}
          {scripts}
        </head>
        <body>{children}</body>
      </html>
    )}
  />
));
