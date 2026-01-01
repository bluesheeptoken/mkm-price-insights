const FORM_BASE =
  "https://docs.google.com/forms/d/e/1FAIpQLSflz3d4dCzT6q5QtfKCNmgCF65EiNxxXsSbEw1XeZFoSWNtOg/formResponse?usp=pp_url";

export function submitYesNo(
  answer: "yes" | "no",
  pageUrl: string,
  prices: number[]
) {
    console.log(answer);
  const params = new URLSearchParams({
    "entry.1988403083": answer,
    "entry.1379742104": pageUrl,
    "entry.167110485": JSON.stringify(prices),
  });

  const url = `${FORM_BASE}&${params.toString()}`;
fetch(url, {
    method: "POST",
    mode: "no-cors",
    });
}

export function openCommentForm() {
  console.log("clicked");
  const base =
    "https://forms.gle/zvjVWNoD9BVL2FcS6";

  window.open(base, "_blank");
}