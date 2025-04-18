
import React from "react";
import { Profile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileViewProps {
  profile: Profile;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile }) => {
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    let initials = "";
    if (firstName) initials += firstName[0];
    if (lastName) initials += lastName[0];
    return initials || profile.email.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4 mb-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.email} />
            <AvatarFallback className="bg-tutoring-blue text-white text-xl">
              {getInitials(profile.first_name, profile.last_name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-center">
            {profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile.email.split('@')[0]}
          </h2>
          <div className="px-3 py-1 bg-tutoring-blue/10 text-tutoring-blue rounded-full text-sm">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </div>
        </div>

        {profile.bio && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
            <p className="text-gray-700 break-words">{profile.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="break-words">{profile.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Joined</h3>
            <p>{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileView;
