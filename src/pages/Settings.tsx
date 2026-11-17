import { useSearchParams } from "react-router"
import SectionHeader from "@/components/editorial/SectionHeader"
import { TabPanel, Tabs } from "@/components/editorial/Tabs"
import { useSectionEyebrow } from "@/lib/nav"
import AccountBlock from "./settings/AccountBlock"
import ApiTokensBlock from "./settings/ApiTokensBlock"
import { AppCredentialsBlock } from "./settings/AppCredentialsBlock"
import BillingBlock from "./settings/BillingBlock"
import BioBlock from "./settings/BioBlock"
import IntegrationsBlock from "./settings/IntegrationsBlock"
import MembersBlock from "./settings/MembersBlock"
import { NewWorkspaceBlock } from "./settings/NewWorkspaceBlock"
import { ProviderKeysBlock } from "./settings/ProviderKeysBlock"
import { VoiceProfilesBlock } from "./settings/VoiceProfilesBlock"
import { WorkspaceBlock } from "./settings/WorkspaceBlock"

const TABS = [
  { value: "account", label: "Account" },
  { value: "workspace", label: "Workspace" },
  { value: "ai", label: "AI" },
  { value: "integrations", label: "Integrations" },
]

export default function Settings() {
  const eyebrow = useSectionEyebrow("/app/settings", "Workspace")
  const [params, setParams] = useSearchParams()
  // Stripe sends people back with ?billing=..., shown on the Account tab (the default).
  const tab = params.get("tab") ?? "account"
  const setTab = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("tab", value)
        next.delete("billing")
        return next
      },
      { replace: true }
    )

  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Settings" />
      <Tabs value={TABS.some((t) => t.value === tab) ? tab : "account"} onValueChange={setTab} tabs={TABS} label="Settings" className="mt-10">
        <TabPanel value="account">
          <AccountBlock />
          <BillingBlock />
          <ApiTokensBlock />
        </TabPanel>
        <TabPanel value="workspace">
          <WorkspaceBlock />
          <BioBlock />
          <MembersBlock />
          <AppCredentialsBlock />
          <NewWorkspaceBlock />
        </TabPanel>
        <TabPanel value="ai">
          <VoiceProfilesBlock />
          <ProviderKeysBlock />
        </TabPanel>
        <TabPanel value="integrations">
          <IntegrationsBlock />
        </TabPanel>
      </Tabs>
    </div>
  )
}
