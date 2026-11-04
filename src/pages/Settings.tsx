import SectionHeader from "@/components/editorial/SectionHeader"
import { useSectionEyebrow } from "@/lib/nav"
import AccountBlock from "./settings/AccountBlock"
import MembersBlock from "./settings/MembersBlock"
import { WorkspaceBlock } from "./settings/WorkspaceBlock"
import { VoiceProfilesBlock } from "./settings/VoiceProfilesBlock"
import { ProviderKeysBlock } from "./settings/ProviderKeysBlock"
import { AppCredentialsBlock } from "./settings/AppCredentialsBlock"
import { NewWorkspaceBlock } from "./settings/NewWorkspaceBlock"

export default function Settings() {
  const eyebrow = useSectionEyebrow("/app/settings", "Workspace")
  return (
    <div className="max-w-[760px]">
      <SectionHeader eyebrow={eyebrow} title="Settings" />
      <AccountBlock />
      <WorkspaceBlock />
      <MembersBlock />
      <VoiceProfilesBlock />
      <ProviderKeysBlock />
      <AppCredentialsBlock />
      <NewWorkspaceBlock />
    </div>
  )
}

