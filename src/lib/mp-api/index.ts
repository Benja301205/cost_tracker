export type MpApiConfig = {
  accessToken: string;
};

export async function requestAccountMoneyReport(_config: MpApiConfig, _from: Date, _to: Date) {
  void _config;
  void _from;
  void _to;
  throw new Error("Mercado Pago report generation needs real account credentials and endpoint validation from the manual spike.");
}

export async function downloadAccountMoneyReport(_config: MpApiConfig, _reportId: string) {
  void _config;
  void _reportId;
  throw new Error("Report download is intentionally stubbed until the API spike confirms personal-account support.");
}
