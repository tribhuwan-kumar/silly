## [Setup](https://github.com/tribhuwan-kumar/silly/releases)

Providing binary only for linux and windows, since its specifically for hosting on servers
Check out github [releases](https://github.com/tribhuwan-kumar/silly/releases) to host Silly on your server

## Docker

```

```

## Systemd

```bash
# check the architecture
curl -LJO https://github.com/tribhuwan-kumar/silly/releases/latest/download/silly-linux-aarch64 && chmod +x silly-linux-aarch64
mv silly-linux-aarch64 /usr/local/bin/silly
curl -LJO https://raw.githubusercontent.com/tribhuwan-kumar/silly/refs/heads/web/systemd/silly.service
mv silly.service /etc/systemd/system/
systemctl daemon-reload
systemctl start silly
```

## Screenshot

![Image](https://github.com/user-attachments/assets/adbdc056-bace-44a9-8ba6-898b4526b65a)

## Disclaimer

This project is for **educational and private use only**. The developer does not condone or encourage copyright infringement.

**Silly** is a third-party tool and is not affiliated with, endorsed by, or connected to Spotify, Tidal, Qobuz, Amazon Music, or any other streaming service.

You are solely responsible for:

1. Ensuring your use of this software complies with your local laws.
2. Reading and adhering to the Terms of Service of the respective platforms.
3. Any legal consequences resulting from the misuse of this tool.

The software is provided "as is", without warranty of any kind. The author assumes no liability for any bans, damages, or legal issues arising from its use.

## App Credit:
- **afkarxyz** [afkarxyz](https://github.com/afkarxyz)

## API Credits

- **Tidal**: [hifi-api](https://github.com/binimum/hifi-api)
- **Qobuz**: [dabmusic.xyz](https://dabmusic.xyz), [squid.wtf](https://squid.wtf), [jumo-dl](https://jumo-dl.pages.dev/)

> [!TIP]
>
> **Star Us**, You will receive all release notifications from GitHub without any delay ~
