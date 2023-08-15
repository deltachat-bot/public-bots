import json
from argparse import Namespace
from pathlib import Path

lang2flag = {
    "en": "🇺🇸",
    "es": "🇪🇸",
    "all": "🌐",
}


def main():
    with Path("data.json").open() as data_file:
        data = json.load(data_file)
    with Path("_config.yml").open("w", encoding="utf-8") as jekyll_cfg:
        jekyll_cfg.write("theme: jekyll-theme-hacker")
    with Path("index.md").open("w", encoding="utf-8") as page:
        page.writelines(
            [
                "## Public Delta Chat Bots\n\n",
                "To verify the bot click the bot address in the table below.\n\n",
                "To see the bot's help try sending `/help` to the bot.\n\n",
                "| Address | Description | Language | Owner |\n",
                "| ------- | ----------- | :------: | ----- |\n",
            ]
        )
        admins = data.get("admins", {})
        for bot in sorted(data["bots"], key=lambda bot: bot["addr"]):
            bot.setdefault("qr", "mailto:" + bot["addr"])
            bot = Namespace(**bot)
            bot.lang = lang2flag.get(bot.lang, bot.lang)
            if bot.admin in admins:
                admin = Namespace(**admins[bot.admin])
                if "url" in admin:
                    bot.admin = f"[{bot.admin}]({admin.url})"
            page.write(
                f"| [{bot.addr}]({bot.qr}) | {bot.description} | {bot.lang} | {bot.admin} |\n"
            )


if __name__ == "__main__":
    main()
