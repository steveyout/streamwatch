import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { getBrandName } from "@/utils/brand";

export interface PageTitleProps {
  k: string;
  subpage?: boolean;
}

export function PageTitle(props: PageTitleProps) {
  const { t } = useTranslation();

  const title = t(props.k);
  const brand = getBrandName();
  const subPageTitle = `${title} - ${brand}`;

  return (
    <Helmet>
      <title>{props.subpage ? subPageTitle : title}</title>
    </Helmet>
  );
}
