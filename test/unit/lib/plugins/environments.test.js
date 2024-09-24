const { when } = require('jest-when')
const Environments = require('../../../../lib/plugins/environments')
const NopCommand = require('../../../../lib/nopcommand');

describe('Environments Plugin test suite', () => {
  let github
  let environment_name = ''
  const org = 'bkeepers'
  const repo = 'test'
  const PrimaryEnvironmentNamesBeingTested = ['wait-timer_environment', 'wait-timer_2_environment', 'reviewers_environment', 'prevent-self-review_environment', 'deployment-branch-policy_environment', 'deployment-branch-policy-custom_environment', 'variables_environment', 'deployment-protection-rules_environment', 'new_environment', 'old_environment']
  const EnvironmentNamesForTheNewEnvironmentsTest = ['new-wait-timer', 'new-reviewers', 'new-prevent-self-review', 'new-deployment-branch-policy', 'new-deployment-branch-policy-custom', 'new-variables', 'new-deployment-protection-rules']
  const AllEnvironmentNamesBeingTested = PrimaryEnvironmentNamesBeingTested.concat(EnvironmentNamesForTheNewEnvironmentsTest)
  const log = { debug: jest.fn(), error: console.error }
  const errors = []

  function fillEnvironment(attrs) {
    if (!attrs.wait_timer) attrs.wait_timer = 0;
    if (!attrs.prevent_self_review) attrs.prevent_self_review = false;
    if (!attrs.reviewers) attrs.reviewers = [];
    if (!attrs.deployment_branch_policy) attrs.deployment_branch_policy = null;
    if (!attrs.variables) attrs.variables = [];
    if (!attrs.deployment_protection_rules) attrs.deployment_protection_rules = [];
    if (!attrs.protection_rules) attrs.protection_rules = [];

    return attrs;
  }

  beforeEach(() => {
    //arrange for all
    github = {
      request: jest.fn(() => Promise.resolve(true))
    }

    AllEnvironmentNamesBeingTested.forEach((environment_name) => {
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name })
        .mockResolvedValue({
          data: {
            variables: []
          }
        })
        when(github.request)
        .calledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name })
        .mockResolvedValue({
          data: {
            custom_deployment_protection_rules: []
          }
        })
      }
    );

    when(github.request)
      .calledWith('GET /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', { org, repo, environment_name: 'deployment-branch-policy-custom_environment' })
      .mockResolvedValue({
        data: {
          branch_policies: []
        }
      }
      );

    when(github.request)
      .calledWith('DELETE /repos/:org/:repo/environments/:environment_name/deployment-branch-policies/:branch_policy_id')
      .mockResolvedValue({});

    when(github.request)
      .calledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies')
      .mockResolvedValue({});

    when(github.request)
      .calledWith('PUT /repos/:org/:repo/environments/:environment_name')
      .mockResolvedValue({});

    when(github.request)
      .calledWith('POST /repos/:org/:repo/environments/:environment_name/variables')
      .mockResolvedValue({});

    when(github.request)
      .calledWith('POST /repos/:org/:repo/environments/:environment_name/deployment_protection_rules')
      .mockResolvedValue({});

    when(github.request)
      .calledWith('DELETE /repos/:org/:repo/environments/:environment_name/deployment_protection_rules/:rule_id')
      .mockResolvedValue({});

  })

  afterEach(() => {
    jest.clearAllMocks();
  });

  // start individual tests

  // wait-timer
  describe('When the existing wait-timer is 0 and the config is set to 1', () => {
    it('detect divergence and set wait-timer to 1', async () => {
      //arrange
      environment_name = 'wait-timer_environment'
      // represent config with a wait timer of 1
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          wait_timer: 1
        }
      ], log, errors);

      //model an existing environment with a wait timer of 0
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                wait_timer: 0
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update to the wait timer was requested with value 1
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          wait_timer: 1
        }));
      })
    })
  })

  // add reviewers
  describe('When there are no existing reviewers and config calls for a user and a team', () => {
    it('detect divergence and set reviewers', async () => {
      //arrange
      environment_name = 'reviewers_environment'
      // represent config with a reviewers being a user and a team
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          reviewers: [
            {
              type: 'User',
              id: 1
            }
          ]
        }
      ], log, errors);

      //model an existing environment with no reviewers
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                protection_rules: [
                  {
                    type: 'required_reviewers',
                    reviewers: [
                      {
                        type: 'User',
                        reviewer: {
                          id: 56,
                          type: 'User'
                        }
                      }
                    ]
                  }
                ]
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update the reviewers
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          reviewers: [
            {
              type: 'User',
              id: 1
            }
          ]
        }));
      })
    })
  })

  // prevent self review
  describe('When prevent self review is false, and the config calls for it to be true', () => {
    it('detect divergence and set prevent self review to true', async () => {
      //arrange
      environment_name = 'prevent-self-review_environment'
      //
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          prevent_self_review: true
        }
      ], log, errors);

      //model an existing environment with prevent self review false
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                prevent_self_review: false
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update the prevent self review boolean
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          prevent_self_review: true
        }));
      })
    })
  })

  // deployment branch policy
  describe('When there is no existing deployment branch policy and the config sets a policy', () => {
    it('detect divergence and set the deployment branch policy from the config', async () => {
      //arrange
      environment_name = 'deployment-branch-policy_environment'
      // represent config with a reviewers being a user and a team
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false
          }
        }
      ], log, errors);

      //model an existing environment with prevent self review false
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                deployment_branch_policy: null
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update branch policy
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false
          }
        }));
      })
    })
  })

  // custom deployment branch policy
  describe('When there is no existing deployment branch policy and the config sets a custom policy', () => {
    it('detect divergence and set the custom deployment branch policy from the config', async () => {
      //arrange
      environment_name = 'deployment-branch-policy-custom_environment'
      // represent config with a custom branch policy
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: [
              'master',
              'dev'
            ]
          }
        }
      ], log, errors);

      //model an existing environment with no branch policies
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                deployment_branch_policy: null
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update the custom branch policies
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: true
          }
        }));
        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          name: 'master'
        }));
        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          name: 'dev'
        }));
      })
    })
  })

  // add variable
  describe('When there are no existing variables and config calls for one', () => {
    it('detect divergence and add the variable', async () => {
      //arrange
      environment_name = 'variables_environment'
      // represent config with a reviewers being a user and a team
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          variables: [
            {
              name: 'test',
              value: 'test'
            }
          ]
        }
      ], log, errors);

      //model an existing environment with no reviewers
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                variables: []
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update the variables
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/variables', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          name: 'test',
          value: 'test'
        }));
      })
    })
  })

  // add deployment protection rules
  describe('When there are no existing deployment protection rules, but config calls for one', () => {
    it('detect divergence and add the deployment protection rule', async () => {
      //arrange
      environment_name = 'deployment-protection-rules_environment'
      // represent config with a deployment protection rule
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          deployment_protection_rules: [
            {
              app_id: 1
            }
          ]
        }
      ], log, errors);

      //model an existing environment with no deployment protection rules
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                deployment_protection_rules: []
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update the deployment protection rules
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          integration_id: 1  // weird that this is integration_id, but above it's app_id
        }));
      })
    })
  })

  // wait-timer unchanged
  describe('When the existing wait-timer is 2 and the config is set to 2', () => {
    it('detect that the value is unchanged, and do nothing', async () => {
      //arrange
      environment_name = 'wait-timer_2_environment'
      // represent config with a wait timer of 2
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
          wait_timer: 2
        }
      ], log, errors);

      //model an existing environment with no reviewers
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: environment_name,
                protection_rules: [
                  {
                    type: 'wait_timer',
                    wait_timer: 2
                  }
                ]
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update to the wait timer was requested with value 2
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).not.toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name,
          wait_timer: 2
        }));
      })
    })
  })

  // Zero existing environments
  describe('When there are no existing environments, and the config has one environment', () => {
    it('detect that and environment needs to be added, and add it', async () => {
      //arrange
      environment_name = 'new_environment'
      // represent a new environment
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
        }
      ], log, errors);

      //model an existing state which has zero environments
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [

            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - the new environment was added
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name
        }));
      })
    })
  })

  // Single environment name change
  describe('When there is one existing environment with an old name, and the config has one environment with a new name', () => {
    it('detect that an environment name has changed, add the new one, and delete the old one', async () => {
      //arrange
      environment_name = 'new_environment'
      const old_environment_name = 'old_environment'
      // represent a new environment
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: environment_name,
        }
      ], log, errors);

      //model an existing environment with an old name
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: old_environment_name
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - the new environment was added
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: environment_name
        }));

        //assert - the old environment was deleted
        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, old_environment_name });
        expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, old_environment_name });
        expect(github.request).toHaveBeenCalledWith('DELETE /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
          org,
          repo,
          environment_name: old_environment_name
        }));

      })
    })
  })

  // original 7 changes all combined together test
  describe('When there are changes across 7 environments', () => {
    it('detect and apply all changes', async () => {
      //arrange
      // represent 7 environments and their desired settings
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: 'wait-timer_environment',
          wait_timer: 1
        },
        {
          name: 'reviewers_environment',
          reviewers: [
            {
              type: 'User',
              id: 1
            },
            {
              type: 'Team',
              id: 2
            }
          ]
        },
        {
          name: 'prevent-self-review_environment',
          prevent_self_review: true
        },
        {
          name: 'deployment-branch-policy_environment',
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false
          }
        },
        {
          name: 'deployment-branch-policy-custom_environment',
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: [
              'master',
              'dev'
            ]
          }
        },
        {
          name: 'variables_environment',
          variables: [
            {
              name: 'test',
              value: 'test'
            }
          ]
        },
        {
          name: 'deployment-protection-rules_environment',
          deployment_protection_rules: [
            {
              app_id: 1
            }
          ]
        }
      ], log, errors);

      // model 7 existing environments and their settings
      // note: wait-timer, required_reviewers, and branch_policy are modeled incorrectly here as they are not wrapped by protection_rules[]
      //       the test succeeds anyway because it so happens that the defaults assigned for missing values, coincidentally match the values below
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: 'wait-timer_environment',
                wait_timer: 0
              }),
              fillEnvironment({
                name: 'reviewers_environment',
                reviewers: []
              }),
              fillEnvironment({
                name: 'prevent-self-review_environment',
                prevent_self_review: false
              }),
              fillEnvironment({
                name: 'deployment-branch-policy_environment',
                deployment_branch_policy: null
              }),
              fillEnvironment({
                name: 'deployment-branch-policy-custom_environment',
                deployment_branch_policy: null
              }),
              fillEnvironment({
                name: 'variables_environment',
                variables: []
              }),
              fillEnvironment({
                name: 'deployment-protection-rules_environment',
                deployment_protection_rules: []
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update to the wait timer was requested with value 1, etc.

        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });

        ['wait-timer_environment', 'reviewers_environment', 'prevent-self-review_environment', 'deployment-branch-policy_environment', 'deployment-branch-policy-custom_environment', 'variables_environment', 'deployment-protection-rules_environment'].forEach((environment_name) => {
            expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });

            expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        });

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'wait-timer_environment',
            wait_timer: 1
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'reviewers_environment',
            reviewers: [
                {
                    type: 'User',
                    id: 1
                },
                {
                    type: 'Team',
                    id: 2
                }
            ]
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'prevent-self-review_environment',
            prevent_self_review: true
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'prevent-self-review_environment',
            prevent_self_review: true
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy_environment',
            deployment_branch_policy: {
                protected_branches: true,
                custom_branch_policies: false
            }
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            deployment_branch_policy: {
                protected_branches: false,
                custom_branch_policies: true
            }
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            name: 'master'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            name: 'dev'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/variables', expect.objectContaining({
            org,
            repo,
            environment_name: 'variables_environment',
            name: 'test',
            value: 'test'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-protection-rules_environment',
            integration_id: 1
        }));
      })
    })
  })

  // Add 7 new environments, each with one environment attribute set
  describe('When there are 7 existing environments and 7 new environments each with one environment attribute in the config', () => {
    it('make changes in the existing environments and also add the 7 new environments', async () => {
      //arrange
      // represent 14 environments (7 new) and their desired settings
      const plugin = new Environments(undefined, github, { owner: org, repo }, [
        {
          name: 'wait-timer_environment',
          wait_timer: 1
        },
        {
          name: 'reviewers_environment',
          reviewers: [
            {
              type: 'User',
              id: 1
            },
            {
              type: 'Team',
              id: 2
            }
          ]
        },
        {
          name: 'prevent-self-review_environment',
          prevent_self_review: true
        },
        {
          name: 'deployment-branch-policy_environment',
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false
          }
        },
        {
          name: 'deployment-branch-policy-custom_environment',
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: [
              'master',
              'dev'
            ]
          }
        },
        {
          name: 'variables_environment',
          variables: [
            {
              name: 'test',
              value: 'test'
            }
          ]
        },
        {
          name: 'deployment-protection-rules_environment',
          deployment_protection_rules: [
            {
              app_id: 1
            }
          ]
        },
        {
            name: 'new-wait-timer',
            wait_timer: 1
        },
        {
            name: 'new-reviewers',
            reviewers: [
                {
                    type: 'User',
                    id: 1
                },
                {
                    type: 'Team',
                    id: 2
                }
            ]
        },
        {
            name: 'new-prevent-self-review',
            prevent_self_review: true
        },
        {
            name: 'new-deployment-branch-policy',
            deployment_branch_policy: {
                protected_branches: true,
                custom_branch_policies: false
            }
        },
        {
            name: 'new-deployment-branch-policy-custom',
            deployment_branch_policy: {
                protected_branches: false,
                custom_branch_policies: [
                    'master',
                    'dev'
                ]
            }
        },
        {
            name: 'new-variables',
            variables: [
                {
                    name: 'test',
                    value: 'test'
                }
            ]
        },
        {
            name: 'new-deployment-protection-rules',
            deployment_protection_rules: [
                {
                    app_id: 1
                }
            ]
        }
      ], log, errors);

      // model 7 existing environments and their settings
      // note: wait-timer, required_reviewers, and branch_policy are modeled incorrectly here as they are not wrapped by protection_rules[]
      //       the test succeeds anyway because it so happens that the defaults assigned for missing values, coincidentally match the values below
      when(github.request)
        .calledWith('GET /repos/:org/:repo/environments', { org, repo })
        .mockResolvedValue({
          data: {
            environments: [
              fillEnvironment({
                name: 'wait-timer_environment',
                wait_timer: 0
              }),
              fillEnvironment({
                name: 'reviewers_environment',
                reviewers: []
              }),
              fillEnvironment({
                name: 'prevent-self-review_environment',
                prevent_self_review: false
              }),
              fillEnvironment({
                name: 'deployment-branch-policy_environment',
                deployment_branch_policy: null
              }),
              fillEnvironment({
                name: 'deployment-branch-policy-custom_environment',
                deployment_branch_policy: null
              }),
              fillEnvironment({
                name: 'variables_environment',
                variables: []
              }),
              fillEnvironment({
                name: 'deployment-protection-rules_environment',
                deployment_protection_rules: []
              })
            ]
          }
        });

      //act - run sync() in environments.js
      await plugin.sync().then(() => {
        //assert - update to the wait timer was requested with value 1, etc.

        expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments', { org, repo });

        ['wait-timer_environment', 'reviewers_environment', 'prevent-self-review_environment', 'deployment-branch-policy_environment', 'deployment-branch-policy-custom_environment', 'variables_environment', 'deployment-protection-rules_environment'].forEach((environment_name) => {
            expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, environment_name });

            expect(github.request).toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, environment_name });
        });

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'wait-timer_environment',
            wait_timer: 1
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'reviewers_environment',
            reviewers: [
                {
                    type: 'User',
                    id: 1
                },
                {
                    type: 'Team',
                    id: 2
                }
            ]
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'prevent-self-review_environment',
            prevent_self_review: true
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'prevent-self-review_environment',
            prevent_self_review: true
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy_environment',
            deployment_branch_policy: {
                protected_branches: true,
                custom_branch_policies: false
            }
        }));

        expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            deployment_branch_policy: {
                protected_branches: false,
                custom_branch_policies: true
            }
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            name: 'master'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment-branch-policies', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-branch-policy-custom_environment',
            name: 'dev'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/variables', expect.objectContaining({
            org,
            repo,
            environment_name: 'variables_environment',
            name: 'test',
            value: 'test'
        }));

        expect(github.request).toHaveBeenCalledWith('POST /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', expect.objectContaining({
            org,
            repo,
            environment_name: 'deployment-protection-rules_environment',
            integration_id: 1
        }));

        //assert - seven new environments were also added
        EnvironmentNamesForTheNewEnvironmentsTest.forEach(new_environment_name => {
          expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/variables', { org, repo, new_environment_name });
          expect(github.request).not.toHaveBeenCalledWith('GET /repos/:org/:repo/environments/:environment_name/deployment_protection_rules', { org, repo, new_environment_name });
          expect(github.request).toHaveBeenCalledWith('PUT /repos/:org/:repo/environments/:environment_name', expect.objectContaining({
            org,
            repo,
            environment_name: new_environment_name
          }));
        });

      })
    })
  })


})

describe('nopifyRequest', () => {
  let github;
  let plugin;
  const org = 'bkeepers';
  const repo = 'test';
  const environment_name = 'test-environment';
  const url = 'PUT /repos/:org/:repo/environments/:environment_name';
  const options = { org, repo, environment_name, wait_timer: 1 };
  const description = 'Update environment wait timer';

  beforeEach(() => {
    github = {
      request: jest.fn(() => Promise.resolve(true))
    };
    plugin = new Environments(undefined, github, { owner: org, repo }, [], { debug: jest.fn(), error: console.error }, []);
  });

  it('should make a request when nop is false', async () => {
    plugin.nop = false;

    await plugin.nopifyRequest(url, options, description);

    expect(github.request).toHaveBeenCalledWith(url, options);
  });

  it('should return NopCommand when nop is true', async () => {
    plugin.nop = true;

    const result = await plugin.nopifyRequest(url, options, description);

    expect(result).toEqual([
      new NopCommand('Environments', { owner: org, repo }, {url, body: options}, description)
    ]);
  });
});
