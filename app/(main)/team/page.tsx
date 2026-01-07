import { getTeamMembers } from '@/app/actions/team'
import { InviteTeamMemberDialog } from '@/components/team/invite-team-member-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserMinus, Mail, Clock } from 'lucide-react'

export default async function TeamPage() {
  const teamMembers = await getTeamMembers()

  function formatDate(dateString: string) {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and their access
          </p>
        </div>
        <InviteTeamMemberDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Team Members ({teamMembers.length})</CardTitle>
          <CardDescription>
            All users with access to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No team members yet. Invite your first team member to get started.
              </p>
              <InviteTeamMemberDialog />
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member: any) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">
                        {member.first_name} {member.last_name || ''}
                      </h3>
                      {member.user_type === 'System User' && (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                      {member.enabled === 0 && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last login: {formatDate(member.last_login)}
                      </div>
                    </div>
                  </div>
                  
                  {member.email !== 'Administrator' && member.email !== 'administrator@example.com' && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Remove ${member.first_name} from the organization?`)) {
                            const { removeTeamMember } = await import('@/app/actions/team')
                            const result = await removeTeamMember(member.email)
                            if (result.success) {
                              window.location.reload()
                            } else {
                              alert(result.error)
                            }
                          }
                        }}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Team Member Limits</h3>
        <p className="text-sm text-muted-foreground">
          Your current plan allows for a specific number of team members. Upgrade your plan to add more users to your organization.
        </p>
      </div>
    </div>
  )
}
